import { SlidersHorizontalIcon } from 'lucide-react';

import { FeaturePreview } from './feature-preview';

/**
 * Build Planner — scaffolded preview. Real soft-cap curves + rune-cost math are
 * future work (docs/projects/future/min-maxing-calculators.md).
 */
export function BuildView() {
  return (
    <FeaturePreview
      icon={SlidersHorizontalIcon}
      title='Build Planner'
      blurb='A soft-cap-aware attribute planner that pre-fills from your save, so you can experiment with respecs and see exactly what each point buys you before spending a Larval Tear.'
      planned={[
        'Attribute sliders with soft-cap markers for every stat',
        'Derived HP / FP / Stamina / Equip Load from your level',
        'Rune-cost estimate to reach a target level',
        'Compare against your current connected character',
      ]}
    />
  );
}
