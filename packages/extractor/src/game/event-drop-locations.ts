import { Data, Effect, FileSystem, Path } from 'effect';

import { type DcxError, dcxDecompress } from '../formats/dcx.ts';
import {
  decodeInstruction,
  type EmedfError,
  loadEmedf,
  opcodeKey,
} from '../formats/emedf.ts';
import { argInts, type EmevdError, parseEmevd } from '../formats/emevd.ts';
import type { OodleError } from '../external/oodle.ts';

/**
 * Exact coordinates for event-awarded item lots (invader / boss / NPC drops that
 * have no MSB Treasure Part and no `NpcParam` lot — e.g. Reduvia from Bloody Finger
 * Nerijus, or the Ruins Greatsword from the Redmane Castle duo boss). These are
 * granted by EMEVD, and the award is **flag-gated**:
 *
 *   RunCommonEvent(award_wrapper, …, flag=F, item_lot=L, …)   // award L when F set
 *   def Event_N(…):                                           // the encounter
 *       if CharacterDead(character): SetEventFlag(F)           // F set on defeat
 *
 * The encounter `character` reaches the flag-setting event in one of two shapes,
 * and we follow **both**:
 *
 *   (a) passed as a `RunEvent(N, character=<entity>, …)` **init param** — templated
 *       invasions (Reduvia → Nerijus `c0000_9001`/1043370740, 13px from truth); or
 *   (b) **hard-coded as a literal** inside the event body — boss-death events such as
 *       `Event_1051362800` whose `CharacterDead(1051360800) and CharacterDead(1051360801)`
 *       gate `EnableFlag(9183)` (→ Ruins Greatsword, lot 10830, awarded by `common.emevd`).
 *
 * The character (invader/boss) is a real, placed (dormant) MSB marker, so either
 * shape yields the exact in-world location. We therefore build **global** (cross-file)
 * indices over **all** `*.emevd.dcx` except `common_func` — the award call and the
 * flag-setting event routinely live in different files (the award in `common.emevd`,
 * the flag set in the boss's `m60_xx_yy` tile). See
 * `docs/projects/item-placement-coverage.md` (Phase 2b/2c).
 */

export class EventDropError extends Data.TaggedError('EventDropError')<{
  readonly detail: string;
}> {}

// Initialize (Common) Event opcodes — see `game/boss-names.ts`.
const RUN_BANK = 2000;
const RUN_EVENT = 0; // RunEvent (same-file target)
const RUN_COMMON = 6; // RunCommonEvent (common_func target)

/** A placed entity's coordinates + whether it's an Enemy/DummyEnemy (a character). */
export interface MarkerCoord {
  readonly mapId: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly isCharacter: boolean;
}
export type MarkerCoords = ReadonlyMap<number, MarkerCoord>;

/** Resolved exact location for an event-awarded lot. */
export interface EventDropLocation {
  readonly mapId: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly viaEntity: number; // the encounter character/region entity it resolved through
}

/**
 * Resolve `lotIds` (event-awarded `ItemLotParam_map` lots) to exact world coords by
 * tracing the EMEVD award→flag→encounter→entity chain. Returns only the lots it could
 * resolve; the caller keeps a coarser fallback for the rest.
 */
export const loadEventDropLocations = (
  gameRoot: string,
  oo2corePath: string,
  markers: MarkerCoords,
  lotIds: ReadonlySet<number>,
): Effect.Effect<
  Map<number, EventDropLocation>,
  EventDropError | DcxError | OodleError | EmevdError | EmedfError,
  FileSystem.FileSystem | Path.Path
> =>
  Effect.gen(function* () {
    const emedf = yield* loadEmedf;
    const setFlag = emedf.byName.get('set event flag');
    if (!setFlag) {
      return yield* new EventDropError({
        detail: 'EMEDF missing "Set Event Flag"',
      });
    }
    const SETFLAG = opcodeKey(setFlag.bank, setFlag.id);

    const fs = yield* FileSystem.FileSystem;
    const dir = `${gameRoot}/event`;
    // All EMEVD files EXCEPT `common_func.emevd.dcx` — that's the template library, whose
    // event bodies use unresolved param placeholders, not real lot/flag/entity ids. We DO
    // include `common.emevd` (cross-map award wrappers like `Event_1100`). Bun.Glob (no
    // effect equiv).
    const glob = new Bun.Glob('*.emevd.dcx');
    const paths = yield* Effect.tryPromise({
      try: async () => {
        const out: string[] = [];
        for await (const p of glob.scan({ cwd: dir, absolute: true }))
          out.push(p);
        return out.filter((p) => !p.endsWith('common_func.emevd.dcx')).sort();
      },
      catch: (cause) =>
        new EventDropError({ detail: `scanning ${dir}: ${String(cause)}` }),
    });

    // Global (cross-file) indices. The award call and the flag-setting encounter event
    // routinely live in different EMEVD files, so everything is accumulated across all
    // files before resolution.
    const awardCalls: Array<{ lot: number; candidates: number[] }> = [];
    const eventInitParams = new Map<number, number[]>(); // RunEvent target → entities passed in
    const flagSetters = new Map<number, number[]>(); // flag → events that EnableFlag(flag)
    const flagToEntities = new Map<number, Set<number>>(); // flag → character entities in the setter's body
    const coPassed = new Map<number, Set<number>>(); // value → other values in the same Run* call

    for (const path of paths) {
      const dcx = yield* fs
        .readFile(path)
        .pipe(
          Effect.mapError(
            (cause) =>
              new EventDropError({ detail: `reading ${path}: ${cause}` }),
          ),
        );
      const emevd = yield* parseEmevd(yield* dcxDecompress(dcx, oo2corePath));

      for (const ev of emevd.events) {
        const enabledFlags: number[] = []; // flags this event EnableFlag()s
        const bodyChars = new Set<number>(); // placed-character ids referenced anywhere in its body
        for (const ins of ev.instructions) {
          if (
            ins.bank === RUN_BANK &&
            (ins.id === RUN_EVENT || ins.id === RUN_COMMON)
          ) {
            const ints = argInts(ins.argData);
            const params = ints.slice(2); // after slot + event-id
            const lot = params.find((p) => lotIds.has(p));
            if (lot !== undefined) {
              awardCalls.push({
                lot,
                candidates: params.filter((p) => p !== lot && p > 0),
              });
            }
            if (ins.id === RUN_EVENT && ints[1] !== undefined) {
              const cur = eventInitParams.get(ints[1]);
              if (cur) cur.push(...params);
              else eventInitParams.set(ints[1], [...params]);
            }
            for (const p of params) {
              let set = coPassed.get(p);
              if (!set) coPassed.set(p, (set = new Set()));
              for (const q of params) if (q !== p) set.add(q);
            }
          } else if (opcodeKey(ins.bank, ins.id) === SETFLAG) {
            const d = decodeInstruction(emedf, ins);
            const flag = d?.args['Target Event Flag ID'];
            const state = d?.args['Desired Flag State'];
            if (state === 1 && typeof flag === 'number' && flag > 0)
              enabledFlags.push(flag);
          }
          // Body-entity scan: any raw int32 that is a placed CHARACTER marker. Safe because
          // real (10-digit) entity ids never collide with flags/other args; `id > 0` excludes
          // the ubiquitous 0 (and any unnamed entity-0 marker).
          for (const v of argInts(ins.argData)) {
            if (v > 0 && markers.get(v)?.isCharacter) bodyChars.add(v);
          }
        }
        for (const flag of enabledFlags) {
          const cur = flagSetters.get(flag);
          if (cur) cur.push(ev.id);
          else flagSetters.set(flag, [ev.id]);
          if (bodyChars.size > 0) {
            let set = flagToEntities.get(flag);
            if (!set) flagToEntities.set(flag, (set = new Set()));
            for (const e of bodyChars) set.add(e);
          }
        }
      }
    }

    const pickMarker = (
      ids: Iterable<number>,
    ): { e: number; m: MarkerCoord } | undefined => {
      const resolved = [...ids].flatMap((e) => {
        const m = markers.get(e);
        return m ? [{ e, m }] : [];
      });
      // Prefer the encounter character (invader/boss) over leash/trigger regions.
      return resolved.find((r) => r.m.isCharacter) ?? resolved[0];
    };

    // Resolve each award → its gate flag → encounter entity → coords.
    const out = new Map<number, EventDropLocation>();
    for (const { lot, candidates } of awardCalls) {
      if (out.has(lot)) continue; // first resolution wins
      for (const flag of candidates) {
        // (1) precise: the flag-setting event's RunEvent init entity (templated invasions).
        let pick: { e: number; m: MarkerCoord } | undefined;
        for (const setterId of flagSetters.get(flag) ?? []) {
          pick = pickMarker(eventInitParams.get(setterId) ?? []);
          if (pick) break;
        }
        // (2) boss-death: a character hard-coded in the flag-setting event's body.
        pick ??= pickMarker(flagToEntities.get(flag) ?? []);
        // (3) templated: an entity co-passed with the flag in some setup call.
        pick ??= pickMarker(coPassed.get(flag) ?? []);
        if (pick) {
          out.set(lot, {
            mapId: pick.m.mapId,
            x: pick.m.x,
            y: pick.m.y,
            z: pick.m.z,
            viaEntity: pick.e,
          });
          break;
        }
      }
    }
    return out;
  });
