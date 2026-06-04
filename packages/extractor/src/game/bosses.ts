import { Data, Effect, FileSystem, Path, PlatformError } from 'effect';

import type { DcxError } from '../formats/dcx.ts';
import type { EmevdError } from '../formats/emevd.ts';
import type { OodleError } from '../external/oodle.ts';
import type { Bnd4Error } from '../formats/bnd4.ts';
import type { FmgError } from '../formats/fmg.ts';
import { decodeRow, type ParamError, parseParam } from '../formats/param.ts';
import { loadParamdef, type ParamdefError } from '../formats/paramdef.ts';
import { type BossNamesError, resolveBossNames } from './boss-names.ts';

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

export class BossesError extends Data.TaggedError('BossesError')<{
  readonly detail: string;
}> {}

export interface BossArea {
  readonly defeatFlagId: number; // GameAreaParam.defeatBossFlagId — the save flag
  readonly name: string | null; // from EMEVD EnableBossHealthBar (null if no boss bar)
  readonly foundFlagId: number;
  readonly challengeFlagId: number;
  readonly mapId: string; // arena map, e.g. "m10_00_00_00", derived from bossMap* bytes
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

const mapIdOf = (areaNo: number, blockNo: number, mapNo: number): string => {
  const pad = (n: number) => n.toString().padStart(2, '0');
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
      return yield* new BossesError({
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
      });
    }
    return bosses;
  });
