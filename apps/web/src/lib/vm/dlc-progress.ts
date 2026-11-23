import { BOSSES, GRACES } from '@elden-ring-compass/data';
import { Array as Arr } from 'effect';

import type { Slot } from '../save-dto';
import { isEventFlagOn } from './events';

const DLC_PROGRESS_FLAGS = [
  ...Arr.map(
    Arr.filter(GRACES, (g) => g.isDlc),
    (g) => g.flagId,
  ),
  ...Arr.map(
    Arr.filter(BOSSES, (b) => b.isDlc),
    (b) => b.defeatFlagId,
  ),
];

/**
 * Whether this character has started Shadow of the Erdtree. The save has no
 * ownership flag — only the byte set when a character first enters the Land of
 * Shadow — so "not started" can't tell "doesn't own it" from "hasn't gone yet".
 * A found DLC grace or a killed DLC boss also counts, in case that byte was
 * cleared (save-repair tools do this).
 */
export const hasStartedDlc = (slot: Readonly<Slot>) =>
  slot.dlc.shadow_of_erdtree ||
  Arr.some(DLC_PROGRESS_FLAGS, (flag) => isEventFlagOn(slot, flag));
