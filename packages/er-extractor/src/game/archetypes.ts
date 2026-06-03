import { Effect } from 'effect';

import type { OodleError } from '../external/oodle.ts';
import type { Bnd4Error } from '../formats/bnd4.ts';
import type { DcxError } from '../formats/dcx.ts';
import type { FmgError } from '../formats/fmg.ts';
import { loadFmgTable, MENU_MSGBNDS } from './fmg-tables.ts';

/**
 * Starting classes (the save's `player_game_data.arche_type`, 0..9). Install-derived:
 * the class names live in `GR_MenuText` FMG at ids 288100 + arche_type, in the exact
 * order the save stores (Vagabond = 0 … Wretch = 9). The base id is the only constant
 * — a documented FMG anchor (like the event-flag bst), not curated data. The web's
 * "Unknown" fallback for an out-of-range value stays a UI concern, not a row here.
 */

export interface Archetype {
  readonly id: number; // save arche_type value (0..9)
  readonly name: string; // GR_MenuText[288100 + id]
}

const ARCHETYPE_NAME_BASE = 288100;
const ARCHETYPE_COUNT = 10;

export const loadArchetypes = (
  gameRoot: string,
  oo2corePath: string,
): Effect.Effect<Archetype[], DcxError | OodleError | Bnd4Error | FmgError> =>
  Effect.gen(function* () {
    const menu = yield* loadFmgTable(
      gameRoot,
      oo2corePath,
      MENU_MSGBNDS,
      'GR_MenuText',
    );
    const out: Archetype[] = [];
    for (let id = 0; id < ARCHETYPE_COUNT; id++) {
      const name = menu.get(ARCHETYPE_NAME_BASE + id);
      if (name) out.push({ id, name });
    }
    return out;
  });
