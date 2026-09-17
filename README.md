# Elden Ring Compass — Save file / Progression Website

### Check it out here: [www.eldenringcompass.com](https://www.eldenringcompass.com)

Upload (or continuously poll) your Elden Ring save and the site reads your
progression — inventory, bosses defeated, graces, map markers, and more —
entirely in your browser. Nothing is ever written back to the save.

## Key Technologies

- **TanStack Start** (full-stack React framework) + **TanStack Router** (file-based routing)
- **React 19** (with the React Compiler)
- **Effect** + **`@effect/atom-react`** — app state and the in-memory data layer (no TanStack Query, no IndexedDB)
- **shadcn** (Base UI variant, `@base-ui/react`) + **Tailwind CSS v4**
- **Leaflet / react-leaflet** — tiled interactive map
- **TanStack Table** + **TanStack Virtual** — virtualized data tables
- **Bun** + **Turborepo** — package manager and monorepo task runner
- **Vite** / **Nitro** — bundling and the production server
- **oxlint / oxfmt** — linting (type-aware via `oxlint-tsgolint`, with Effect rules from `@effect/tsgo`) and formatting
- **TypeScript 7** (native `tsc`, patched by `@effect/tsgo` for Effect diagnostics) — type checking
- **Vitest** + **Playwright** — unit, browser, and E2E tests

## Monorepo Layout

| Package                                   | What it is                                                                                                                                                                |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web`                                | The website itself.                                                                                                                                                       |
| `packages/data`                           | The **single runtime data source** — game data + item icons baked by the extractor. This is all the web app consumes.                                                     |
| `packages/save-parser` (`save-parser-ts`) | Pure-TypeScript Elden Ring save parser. Runs in the browser/worker.                                                                                                       |
| `packages/extractor` (`er-extractor`)     | Build-time CLI that reads an installed copy of the game and bakes everything `data` needs (names, stats, markers, icons, graces, event scripts).                          |
| `packages/vendored-data`                  | Build-time-only reverse-engineered constants the extractor can't derive from the install (event-flag tables, AES/RSA keys, param schemas). See its README for provenance. |
| `packages/config/*`                       | Shared TypeScript / oxlint config.                                                                                                                                        |

## Data & Save Parsing

The save parser is **pure TypeScript** — the old Rust/WASM save-editor stack has
been removed (the TS port is dramatically faster and ships with no native deps).

Game data is produced by our own `er-extractor`, which reads the installed game
directly (Oodle decompression via `bun:ffi`, dvdbnd unpacking, FMG/PARAM/MSB/EMEVD
parsing) and bakes the result into `@elden-ring-compass/data`. This replaces the
external `erdb` dataset the project originally relied on. The reverse-engineered
constants that can't be read from the install are vendored in `packages/vendored-data`,
adapted from these excellent upstream projects:

- [ER-Save-Lib](https://github.com/ClayAmore/ER-Save-Lib) — save-format constants (event-flag table, regulation key)
- [UXM-Selective-Unpack](https://github.com/Nordgaren/UXM-Selective-Unpack) — archive RSA keys + file-path dictionary
- [soulsmods / Paramdex](https://github.com/soulsmods/Paramdex) — PARAMDEF field schemas for `regulation.bin`
- [soulstruct](https://github.com/Grimrukh/soulstruct) — EMEVD instruction dictionary (EMEDF)

## Features

- **In-browser save parsing**: your save is parsed locally — it never leaves your machine, and the site never writes to it.
- **Continuous save polling**: point the tab at your save and it keeps the view updated as you play, without re-uploading.
- **Local storage sync**: map position, row selection, and column filters all persist locally.
- **Tiled interactive map** with item/boss/grace markers.

## Additional Details

The default code snippet requires Node.js for the HTTP server, but any simple HTTP file server will work.

If you prefer, you can manually upload the save without using continuous polling.

## Can this get me banned?

No, this site has no ability to make changes to the save. For edits to be possible, you would either need to redownload your save after uploading or the HTTP server would need to support PUT/POST requests, which if you use the snippet provided it doesn't. (Not that my site even makes these requests)
Elden Ring is fine with other programs reading or copying the save. Steam does this repeatedly to make cloud backups.

Let me know what you think!

## Contributing

### Prerequisites

The web app only needs **[Bun](https://bun.sh/)**. A reproducible toolchain is also
provided via **Nix** (`flake.nix`).

> Note: building game `data` from scratch with `er-extractor` additionally requires an
> installed copy of Elden Ring and the Rust toolchain (for the extractor's native image
> codec). You do **not** need either to run or develop the web app — the prebuilt `data`
> package is committed.

#### Setting up Nix (recommended)

If you have Nix installed with flake support enabled:

```bash
# Enter the development shell (auto-activates with direnv if installed)
nix develop

# Or if using direnv:
direnv allow
```

#### Without Nix

Just install [Bun](https://bun.sh/).

### Setup

Install dependencies:

```bash
bun install
```

### Development

Start the development server:

```bash
bun run dev
```

### Checks

```bash
# Lint + format
bun run lint

# Type checking (TypeScript 7 native tsc)
bun run typecheck

# Tests
bun run test

# Full production build
bun run build
```
