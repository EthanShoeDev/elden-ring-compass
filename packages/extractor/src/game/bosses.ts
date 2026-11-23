import {
  Array as Arr,
  Effect,
  FileSystem,
  Path,
  PlatformError,
  Schema,
  String as Str,
} from 'effect';

import type { OodleError } from '../external/oodle.ts';
import type { Bnd4Error } from '../formats/bnd4.ts';
import type { DcxError } from '../formats/dcx.ts';
import type { EmevdError } from '../formats/emevd.ts';
import type { FmgError } from '../formats/fmg.ts';
import { decodeRow, type ParamError, parseParam } from '../formats/param.ts';
import { loadParamdef, type ParamdefError } from '../formats/paramdef.ts';
import { type BossNamesError, resolveBossNames } from './boss-names.ts';
import { mapAreaOf } from './map-archives.ts';
import type { MapEntity } from './map-markers.ts';

/**
 * Derives boss DEFEAT event flags from `GameAreaParam` (the param behind boss
 * arenas / fog gates) — base + DLC, straight from the install. Each row is a boss
 * arena; `defeatBossFlagId` is the save event flag set when that boss dies (the
 * id the save parser checks; matches the legacy BOSSES.ts ids, e.g. Godrick
 * 10000800, Messmer 21010800, Radahn 20010800).
 *
 * Names come from the EMEVD `EnableBossHealthBar` instruction via
 * `resolveBossNames` (see boss-names.ts) — authoritative, since story bosses are
 * spawned dynamically and aren't named in any param/MSB. ~95% of arenas resolve;
 * the rest are roaming/field bosses without a boss healthbar (name = null).
 */

export class BossesError extends Schema.TaggedError<
  BossesError,
  { readonly brand: unique symbol }
>()('BossesError', { detail: Schema.String }) {}

export interface BossArea {
  readonly defeatFlagId: number; // GameAreaParam.defeatBossFlagId — the save flag
  readonly name: string | null; // from EMEVD EnableBossHealthBar (null if no boss bar)
  readonly foundFlagId: number;
  readonly challengeFlagId: number;
  readonly mapId: string; // arena map, e.g. "m10_00_00_00", derived from bossMap* bytes
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly runes: number; // rune bounty for the kill (GameAreaParam.bonusSoul_single)
}

export interface ResolvedBoss extends BossArea {
  readonly isDlc: boolean; // arena map ships in DLC.bdt (see map-archives.ts)
}

/**
 * Settle each boss's arena map, then flag DLC bosses.
 *
 * A few DLC `GameAreaParam` rows are clones of a base-game row that were never
 * filled in: Golden Hippopotamus (21000850) carries Malenia's exact arena
 * (`m15_00_00_00`, same coordinates) and Base Serpent Messmer (21010800) her map
 * id, which put both on the Haligtree. The boss's own MSB enemy part — whose
 * entity id is the defeat flag — is placed in its real map (Shadow Keep, m21),
 * so when the two disagree on the map AREA, the MSB placement wins. Within one
 * area they routinely differ by tile or LOD (`m60_44_36_00` arena vs a `…_10`
 * spawn; one flag shared by two Bell Bearing Hunter arenas) and the param's
 * arena position is the right one, so it is kept.
 */
export const resolveBossArenas = (
  bosses: readonly BossArea[],
  entities: readonly MapEntity[],
  dlcAreas: ReadonlySet<number>,
) => {
  const placed = new Map(
    Arr.map(
      Arr.filter(entities, (e) => e.kind === 'part'),
      (e) => [e.entityID, e] as const,
    ),
  );
  const overrides: string[] = [];
  const resolved = Arr.map(bosses, (b): ResolvedBoss => {
    const part = placed.get(b.defeatFlagId);
    const arena =
      part !== undefined && mapAreaOf(part.mapId) !== mapAreaOf(b.mapId)
        ? { mapId: part.mapId, x: part.x, y: part.y, z: part.z }
        : { mapId: b.mapId, x: b.x, y: b.y, z: b.z };
    if (arena.mapId !== b.mapId)
      overrides.push(
        `${b.defeatFlagId} ${b.name ?? '(unnamed)'}: ${b.mapId} → ${arena.mapId}`,
      );
    return { ...b, ...arena, isDlc: dlcAreas.has(mapAreaOf(arena.mapId)) };
  });
  return { bosses: resolved, overrides };
};

const mapIdOf = (areaNo: number, blockNo: number, mapNo: number): string => {
  const pad = (n: number) => Str.padStart(2, '0')(n.toString());
  // bossMapMapNo is the 3rd map-id segment; the 4th is always 00 for arenas.
  return `m${pad(areaNo)}_${pad(blockNo)}_${pad(mapNo)}_00`;
};

type BossErrors =
  | BossesError
  | ParamError
  | ParamdefError
  | BossNamesError
  | DcxError
  | OodleError
  | EmevdError
  | Bnd4Error
  | FmgError
  | PlatformError.PlatformError;

export const loadBosses = (
  params: Map<string, Uint8Array>,
  gameRoot: string,
  oo2corePath: string,
): Effect.Effect<BossArea[], BossErrors, FileSystem.FileSystem | Path.Path> =>
  Effect.gen(function* () {
    const bytes = params.get('GameAreaParam');
    if (!bytes)
      return yield* BossesError.make({
        detail: 'GameAreaParam missing from regulation',
      });

    const param = yield* parseParam(bytes);
    const def = yield* loadParamdef('GameAreaParam');
    const names = yield* resolveBossNames(gameRoot, oo2corePath);

    const bosses: BossArea[] = [];
    for (const r of param.rows) {
      const f = decodeRow(bytes, r.dataOffset, def, param.little);
      const defeatFlagId = Number(f.get('defeatBossFlagId'));
      if (defeatFlagId <= 0) continue; // a few non-boss rows
      // The healthbar `character` equals the defeat flag for almost all bosses;
      // a few differ, so fall back to the flag seen in the boss event's init call.
      const name =
        names.byCharacter.get(defeatFlagId) ??
        names.byInitFlag.get(defeatFlagId) ??
        null;
      bosses.push({
        defeatFlagId,
        name,
        foundFlagId: Number(f.get('foundBossFlagId')),
        challengeFlagId: Number(f.get('bossChallengeFlagId')),
        mapId: mapIdOf(
          Number(f.get('bossMapAreaNo')),
          Number(f.get('bossMapBlockNo')),
          Number(f.get('bossMapMapNo')),
        ),
        x: Number(f.get('bossPosX')),
        y: Number(f.get('bossPosY')),
        z: Number(f.get('bossPosZ')),
        runes: Number(f.get('bonusSoul_single')),
      });
    }
    return bosses;
  });
