/**
 * Resolved paths threaded through every pipeline stage.
 *
 * `gameDir`  — the install folder the user pointed at (contains `Game/`).
 * `gameRoot` — `<gameDir>/Game`, where `regulation.bin`, `msg/`, `menu/`,
 *              `map/mapstudio/`, and the `oo2core_*.dll` Oodle decoder live.
 * `outDir`   — scratch + artifact output directory.
 */
export interface PipelineContext {
  readonly gameDir: string;
  readonly gameRoot: string;
  readonly outDir: string;
}
