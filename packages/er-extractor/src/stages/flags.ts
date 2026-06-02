import { Effect } from 'effect';

/**
 * Stage 6 — event flags. Graces derive from BonfireWarpParam (self-updating).
 * Boss defeat flags use the Grand Archives CT overlay in v1, then EMEVD parsing
 * later (plan §7). Log the curated-vs-derived boundary so nothing goes stale.
 */
export const flags = Effect.logInfo(
  'TODO: grace flags (param) + boss flags (CT overlay → EMEVD)',
);
