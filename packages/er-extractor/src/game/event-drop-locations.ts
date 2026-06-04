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
 * Nerijus). These are granted by EMEVD, and the award is **flag-gated**:
 *
 *   RunCommonEvent(award_wrapper, …, flag=F, item_lot=L, …)   // award L when F set
 *   def Event_N(character, region, …):                        // the encounter
 *       if CharacterDead(character): SetEventFlag(F)           // F set on defeat
 *   RunEvent(N, character=<entity>, …)                        // N initialised here
 *
 * So we trace `L → its co-passed flag F → the event that SetEventFlag(F) → that
 * event's initialised character/region entity → the entity's placed MSB coords`.
 * The encounter character (invader/boss) is a real, placed (dormant) MSB marker,
 * so this yields the exact in-world location. Verified: Reduvia → Nerijus
 * (`c0000_9001`, entity 1043370740) → 13px from the hand-clicked spot.
 *
 * Robustness: we resolve **constant** award flags (the common per-tile-event case).
 * Templated encounters whose flag is itself a parameter are not yet followed (the
 * caller falls back to the lot's tile). Award/encounter are matched **within one
 * EMEVD file** (the per-map file that handles the tile). See
 * `docs/projects/item-placement-coverage.md` (Phase 2b).
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
      return yield* new EventDropError({ detail: 'EMEDF missing "Set Event Flag"' });
    }
    const SETFLAG = opcodeKey(setFlag.bank, setFlag.id);

    const fs = yield* FileSystem.FileSystem;
    const dir = `${gameRoot}/event`;
    // Only per-map files (`m*.emevd.dcx`); skip `common*`. Bun.Glob (no effect equiv).
    const glob = new Bun.Glob('m*.emevd.dcx');
    const paths = yield* Effect.tryPromise({
      try: async () => {
        const out: string[] = [];
        for await (const p of glob.scan({ cwd: dir, absolute: true })) out.push(p);
        return out.sort();
      },
      catch: (cause) => new EventDropError({ detail: `scanning ${dir}: ${String(cause)}` }),
    });

    const out = new Map<number, EventDropLocation>();
    for (const path of paths) {
      const dcx = yield* fs
        .readFile(path)
        .pipe(Effect.mapError((cause) => new EventDropError({ detail: `reading ${path}: ${cause}` })));
      const emevd = yield* parseEmevd(yield* dcxDecompress(dcx, oo2corePath));

      // Pass 1 (cheap, argInts only): does this file award any of our lots?
      const awardCalls: Array<{ lot: number; candidates: number[] }> = [];
      for (const ev of emevd.events) {
        for (const ins of ev.instructions) {
          if (ins.bank !== RUN_BANK || (ins.id !== RUN_COMMON && ins.id !== RUN_EVENT)) continue;
          const params = argInts(ins.argData).slice(2); // after slot + event-id
          const lot = params.find((p) => lotIds.has(p));
          if (lot !== undefined) awardCalls.push({ lot, candidates: params.filter((p) => p !== lot) });
        }
      }
      if (awardCalls.length === 0) continue;

      // Pass 2: index init-params (entities per same-file event), constant flag setters,
      // and — for templated encounters — the entities co-passed with each value in any
      // Initialize call (so a setup that passes `(flag, npc, region)` links flag→entity).
      const eventInitParams = new Map<number, number[]>();
      const flagSetters = new Map<number, number[]>();
      const coPassed = new Map<number, Set<number>>(); // value → other values in the same Run* call
      for (const ev of emevd.events) {
        for (const ins of ev.instructions) {
          if (ins.bank === RUN_BANK && (ins.id === RUN_EVENT || ins.id === RUN_COMMON)) {
            const ints = argInts(ins.argData);
            const params = ints.slice(2);
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
            if (state === 1 && flag !== undefined && flag > 0) {
              const cur = flagSetters.get(flag);
              if (cur) cur.push(ev.id);
              else flagSetters.set(flag, [ev.id]);
            }
          }
        }
      }

      const pickMarker = (ids: Iterable<number>): { e: number; m: MarkerCoord } | undefined => {
        const resolved = [...ids].flatMap((e) => {
          const m = markers.get(e);
          return m ? [{ e, m }] : [];
        });
        // Prefer the encounter character (invader/boss) over leash/trigger regions.
        return resolved.find((r) => r.m.isCharacter) ?? resolved[0];
      };

      // Trace each award → its co-passed flag → encounter entity → coords.
      for (const { lot, candidates } of awardCalls) {
        if (out.has(lot)) continue; // first resolution wins
        for (const flag of candidates) {
          // (1) constant flag set in a same-file event → that event's init entity.
          let pick: { e: number; m: MarkerCoord } | undefined;
          for (const setterId of flagSetters.get(flag) ?? []) {
            pick = pickMarker(eventInitParams.get(setterId) ?? []);
            if (pick) break;
          }
          // (2) templated: an entity co-passed with the flag in some setup call.
          pick ??= pickMarker(coPassed.get(flag) ?? []);
          if (pick) {
            out.set(lot, { mapId: pick.m.mapId, x: pick.m.x, y: pick.m.y, z: pick.m.z, viaEntity: pick.e });
            break;
          }
        }
      }
    }
    return out;
  });
