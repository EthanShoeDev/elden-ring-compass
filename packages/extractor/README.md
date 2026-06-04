# @elden-ring-compass/extractor

The **data backend** for eldenringcompass.com. Point it at an Elden Ring install
dir and it regenerates everything the site needs — item/equipment names + stats,
icons, event flags (graces/bosses), regions, map markers, and map images — so a
game patch becomes a one-command refresh.

See the full design + dependency-robustness analysis in
[`docs/projects/dlc-support.md`](../../docs/projects/dlc-support.md).

## Stack

- **[@effect/cli](https://effect.website/docs/guides/command-line)** — arg parsing (`src/cli.ts`).
- **[@effect/platform](https://effect.website) `Command`** — running external tools like WitchyBND (`src/external/witchy.ts`).
- **Bun** runtime via `@effect/platform-bun` (`BunContext.layer` provides `FileSystem` + `CommandExecutor`).

The companion **save parser** has a pure-TS port (`packages/save-parser`,
`@elden-ring-compass/save-parser-ts`) running alongside the Rust → WASM one
(`packages/elden-ring-save-parser`) behind a flag; this package only generates the
_data_ both consume. See `docs/projects/typescript-save-parser-port.md`.

## Usage

```bash
# from the repo root
bun --filter @elden-ring-compass/extractor extract \
  --game-dir "C:\\Program Files (x86)\\Steam\\steamapps\\common\\ELDEN RING"

# or from this package
bun src/bin.ts extract --game-dir "<install dir>" --out .er-extractor-out
```

`--game-dir`/`-g` is the folder containing `Game/` (where `regulation.bin`,
`msg/`, `menu/`, `map/mapstudio/`, and `oo2core_*.dll` live).

## Pipeline (`src/pipeline.ts` → `src/stages/*`)

| #   | Stage     | Output                                                    |
| --- | --------- | --------------------------------------------------------- |
| 1   | `unpack`  | decrypt/decompress regulation (zstd) + game files (Oodle) |
| 2   | `params`  | EquipParam\* / BonfireWarpParam / WorldMapPoint rows      |
| 3   | `text`    | FMG id→name maps (base + `_dlc01`)                        |
| 4   | `join`    | params ⨝ text → item/equipment records                    |
| 5   | `markers` | MSB entity coords → map markers                           |
| 6   | `flags`   | grace flags (param) + boss flags (CT overlay → EMEVD)     |
| 7   | `images`  | TPF→DDS→PNG icons + Land of Shadow map image              |
| 8   | `codegen` | emit raw-db `.ts` + parser `.rs`                          |

Every stage is currently a **stub** that logs its intent — run `extract` to see
the plan execute end-to-end. Fill them in per the phased plan.

## Runtime requirement

Runs on **native Windows** (Bun for Windows), not WSL. The Oodle (`DCX_KRAK`)
game files are decompressed by loading the game's own `oo2core_*_win64.dll` via
`bun:ffi` — same approach as soulstruct/WitchyBND — and `bun:ffi` can only load
a host-OS library, so a Windows DLL can't be loaded from WSL/Linux. Reading the
install dir over `/mnt/c/...` would work; executing the DLL would not.

## Status

Scaffold only. **Phase 1 go/no-go spike** (run on Windows): prove `bun:ffi` →
the game's `oo2core_*_win64.dll` can Oodle-decompress one `msgbnd`
(`src/external/oodle.ts`). If that works, the pure-TS path is green.
