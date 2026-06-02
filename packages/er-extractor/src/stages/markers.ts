import { Effect } from 'effect';

/**
 * Stage 5 — markers (MSB). Parse m60/m61 MSBs → entity (x,y,z); correlate
 * entity ids ↔ event flags ↔ names → map-db coordinates, calibrated to the
 * affine transform in `interactive-map.tsx`. v1 may shell out to WitchyBND
 * (see ../external/witchy); Phase 7 ports MSB parsing to TS.
 */
export const markers = Effect.logInfo(
  'TODO: MSB entity coords → map markers',
);
