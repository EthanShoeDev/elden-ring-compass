import { ListChecksIcon } from 'lucide-react';

import { FeaturePreview } from './feature-preview';

/**
 * Quest Compass — scaffolded preview. The save-aware questline tracker (per-NPC
 * step state from event flags, missable warnings) is future work
 * (docs/projects/future/quest-compass.md). Replaces the empty quests-section
 * placeholder in the new layout.
 */
export function QuestsView() {
  return (
    <FeaturePreview
      icon={ListChecksIcon}
      title='Quest Compass'
      blurb='Read your save’s event flags and answer the question a static wiki can’t: given where you are, what should you do next to advance each NPC questline — and what are you about to permanently miss?'
      planned={[
        'Per-NPC questline tracks (Ranni, Boc, Alexander, Millicent, …)',
        'Your current step + next step, derived from your save flags',
        'Missable warnings: “do this before resting at that grace”',
        'Pin the next objective on the interactive map',
      ]}
    />
  );
}
