import { BuildPlannerSection } from '@/components/sections/build-planner';

/**
 * Build / Calculator view: a soft-cap-aware attribute planner (sliders prefilled
 * from the save) that drives estimated derived stats, a rune-cost readout, and
 * the live Weapon AR ranking — one shared attribute model
 * (docs/projects/calculator.md).
 */
export function BuildView() {
  return <BuildPlannerSection />;
}
