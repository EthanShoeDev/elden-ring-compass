import { Data, Effect, FileSystem, PlatformError } from 'effect';

import { type DcxError, dcxDecompress } from '../formats/dcx.ts';
import {
  argInts,
  type Emevd,
  type EmevdEvent,
  type EmevdError,
  parseEmevd,
} from '../formats/emevd.ts';
import type { OodleError } from '../external/oodle.ts';
import type { Bnd4Error } from '../formats/bnd4.ts';
import type { FmgError } from '../formats/fmg.ts';
import { ITEM_MSGBNDS, loadFmgTable } from './fmg-tables.ts';

/**
 * Resolves boss names from EMEVD — the authoritative source, since story bosses
 * are spawned dynamically (the MSB holds only placeholder dummies) so their name
 * exists only in the event scripts. The `EnableBossHealthBar` instruction
 * (2003[11]) carries `character` (the boss entity, which equals its defeat flag
 * for almost all bosses) and `name` (an `NpcName` FMG id). Most field bosses use
 * a shared template in `common_func` whose healthbar args are parameterized, so
 * we also resolve those by substituting each `Initialize(Common)Event` call's
 * args through the target event's `Parameter` records.
 *
 * Returns two lookups keyed for `bosses.ts` to join `GameAreaParam.defeatBossFlagId`:
 *   - byCharacter: healthbar `character` → name (the common case, char == flag)
 *   - byInitFlag:  a defeat-flag value seen in the init call → name (the few
 *     bosses whose healthbar character differs from the flag)
 *
 * Caveats: multi-phase bosses have several healthbars under one character; we
 * keep the first seen (e.g. Messmer resolves to his serpent-phase name, not
 * "Messmer the Impaler"). ~10 roaming/field bosses (Night's Cavalry, etc.) use a
 * normal name bar rather than 2003[11], so they resolve to no name.
 */

export class BossNamesError extends Data.TaggedError('BossNamesError')<{
  readonly detail: string;
}> {}

export interface BossNameTables {
  readonly byCharacter: Map<number, string>;
  readonly byInitFlag: Map<number, string>;
}

const HEALTHBAR_BANK = 2003;
const HEALTHBAR_ID = 11; // EnableBossHealthBar; args: state(byte), character, bar_slot, name
const RUN_BANK = 2000;
const RUN_EVENT = 0; // RunEvent (same-file target)
const RUN_COMMON = 6; // RunCommonEvent (common_func target)

const i32le = (b: Uint8Array, o: number): number =>
  o + 4 <= b.length
    ? new DataView(b.buffer, b.byteOffset, b.byteLength).getInt32(o, true)
    : 0;

const isHealthbar = (bank: number, id: number) =>
  bank === HEALTHBAR_BANK && id === HEALTHBAR_ID;

interface ResolvedBar {
  readonly character: number;
  readonly nameId: number;
  readonly initFlags: number[]; // candidate defeat flags from the init call's args
}

/**
 * All boss healthbars reachable from one EMEVD: concrete ones read directly, and
 * templated ones resolved per Initialize call via the target event's Parameters.
 */
function resolveBars(
  emevd: Emevd,
  commonFunc: Map<number, EmevdEvent>,
): ResolvedBar[] {
  const out: ResolvedBar[] = [];
  const sameFile = new Map<number, EmevdEvent>();
  for (const e of emevd.events) sameFile.set(e.id, e);

  for (const ev of emevd.events) {
    // Direct (concrete) healthbars.
    for (const ins of ev.instructions) {
      if (isHealthbar(ins.bank, ins.id)) {
        const a = argInts(ins.argData);
        const character = a[1];
        const nameId = a[3];
        if (
          character !== undefined &&
          nameId !== undefined &&
          character > 0 &&
          nameId > 0
        ) {
          out.push({ character, nameId, initFlags: [] });
        }
      }
    }
    // Templated healthbars: follow Initialize calls into their target event.
    for (const ins of ev.instructions) {
      if (
        ins.bank !== RUN_BANK ||
        (ins.id !== RUN_EVENT && ins.id !== RUN_COMMON)
      )
        continue;
      const targetId = i32le(ins.argData, 4);
      const target =
        ins.id === RUN_COMMON
          ? commonFunc.get(targetId)
          : sameFile.get(targetId);
      if (
        !target ||
        !target.instructions.some((t) => isHealthbar(t.bank, t.id))
      )
        continue;

      const paramBytes = ins.argData.subarray(8); // after slot + event_id
      const initFlags = argInts(ins.argData).slice(2); // the passed params, as int32s
      for (const [idx, t] of target.instructions.entries()) {
        if (!isHealthbar(t.bank, t.id)) continue;
        const buf = new Uint8Array(t.argData);
        for (const p of target.parameters) {
          if (p.instructionIndex !== idx) continue;
          for (let k = 0; k < p.byteCount; k++) {
            const src = paramBytes[p.sourceStartByte + k];
            if (src !== undefined) buf[p.targetStartByte + k] = src;
          }
        }
        const character = i32le(buf, 4);
        const nameId = i32le(buf, 12);
        if (character > 0 && nameId > 0)
          out.push({ character, nameId, initFlags });
      }
    }
  }
  return out;
}

export const resolveBossNames = (
  gameRoot: string,
  oo2corePath: string,
): Effect.Effect<
  BossNameTables,
  | BossNamesError
  | DcxError
  | OodleError
  | EmevdError
  | Bnd4Error
  | FmgError
  | PlatformError.PlatformError,
  FileSystem.FileSystem
> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const npcName = yield* loadFmgTable(
      gameRoot,
      oo2corePath,
      ITEM_MSGBNDS,
      'NpcName',
    );

    const eventDir = `${gameRoot}/event`;
    const paths = yield* Effect.tryPromise({
      try: async () => {
        const out: string[] = [];
        for await (const p of new Bun.Glob('*.emevd.dcx').scan({
          cwd: eventDir,
          absolute: true,
        }))
          out.push(p);
        return out.toSorted();
      },
      catch: (cause) =>
        new BossNamesError({
          detail: `scanning ${eventDir}: ${String(cause)}`,
        }),
    });
    if (paths.length === 0) {
      return yield* new BossNamesError({
        detail: `no EMEVDs under ${eventDir} — run unpack first`,
      });
    }

    const readEmevd = (path: string) =>
      Effect.gen(function* () {
        const dcx = yield* fs.readFile(path);
        return yield* parseEmevd(yield* dcxDecompress(dcx, oo2corePath));
      });

    // common_func is the template pool for RunCommonEvent targets.
    const commonPath = paths.find((p) => p.endsWith('common_func.emevd.dcx'));
    const commonFunc = new Map<number, EmevdEvent>();
    if (commonPath) {
      for (const e of (yield* readEmevd(commonPath)).events)
        commonFunc.set(e.id, e);
    }

    const byCharacter = new Map<number, string>();
    const byInitFlag = new Map<number, string>();
    for (const path of paths) {
      const emevd = yield* readEmevd(path);
      for (const bar of resolveBars(emevd, commonFunc)) {
        const name = npcName.get(bar.nameId);
        if (!name) continue;
        if (!byCharacter.has(bar.character))
          byCharacter.set(bar.character, name);
        for (const flag of bar.initFlags) {
          if (!byInitFlag.has(flag)) byInitFlag.set(flag, name);
        }
      }
    }
    return { byCharacter, byInitFlag };
  });
