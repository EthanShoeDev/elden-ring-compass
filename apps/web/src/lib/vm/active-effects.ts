import { spEffectLabelById } from '../game-data';
import type { Slot } from '../wasm-wrapper';

/**
 * Active sp_effects on the character, labelled where the granting item is known.
 * The save ships SpEffectParam ids + remaining time only; `spEffectLabelById`
 * names them by inverting item→SpEffect references (partial coverage — nested-leaf
 * effects stay unlabeled; see `er-extractor/src/game/sp-effect-labels.ts`).
 *
 * `remainingTime`: a timed buff counts down toward 0; a permanent/resident effect
 * (equipped gear, passives) carries a negative or sentinel value — treated as "—".
 */
export interface ActiveEffect {
  readonly id: number;
  readonly label: string | null;
  readonly source: string | null;
  readonly remainingTime: number;
}

export function activeEffectsDbView(slot?: Readonly<Slot>): ActiveEffect[] {
  if (!slot) return [];
  return slot.sp_effects.map((e) => {
    const l = spEffectLabelById.get(e.sp_effect_id);
    return {
      id: e.sp_effect_id,
      label: l?.label ?? null,
      source: l?.source ?? null,
      remainingTime: e.remaining_time,
    };
  });
}
