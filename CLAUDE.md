# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Environment

This project uses **Nix with flake.nix** as the primary development environment setup. If Nix is not available, developers must manually install Rust toolchain, wasm-pack, and Bun.

**CRITICAL**: The WASM parser MUST be built before any development work:
```bash
bun run build:wasm-parser
```

Without this step, TypeScript will error on missing assets and the app cannot run.

## Build System

### Commands

```bash
# Development
bun run dev                    # Start dev server on port 5173

# Building
bun run build:wasm-parser     # Build Rust WASM package (required first)
bun run build                 # Build the app (depends on WASM build)

# Linting/Formatting (managed by Turbo)
bun run lint                  # Auto-fix with oxlint, format with oxfmt, typecheck
bun run lint:oxlint           # Lint only
bun run lint:oxlint:fix       # Auto-fix lint issues
bun run fmt:write             # Format code with oxfmt
bun run fmt:check             # Check formatting
bun run typecheck             # TypeScript type checking
```

### Turbo Orchestration

The build system uses Turbo (`turbo.json`) to orchestrate tasks:
- `bun run build` automatically triggers `build:wasm-parser` first
- `bun run lint` runs oxlint fix, oxfmt format, and typecheck in sequence

## Architecture

### Core Technology Stack

- **TanStack Start**: Full-stack React framework with SSR and prerendering
- **TanStack Router**: File-based routing (routes defined in `src/routes/`)
- **TanStack Query**: Data fetching and caching
- **React 19 RC**: Latest React features
- **Tailwind CSS v4**: Styling via `@tailwindcss/vite` plugin
- **oxlint/oxfmt**: Fast linting/formatting (replaces ESLint/Prettier)
- **Bun**: Package manager and runtime

### WASM Integration

The app compiles a Rust save file parser to WebAssembly:

1. **Source**: `packages/elden-ring-save-parser/` contains Rust code (forked from ER-Save-Editor)
2. **Build**: `wasm-pack build --target web` produces WASM bindings in `pkg/`
3. **Import**: TypeScript imports from `elden-ring-save-parser` package
4. **Worker**: `src/lib/er-save-parser.ts` runs WASM in a Web Worker via Comlink for non-blocking parsing
5. **Wrapper**: `src/lib/wasm-wrapper.ts` provides typed interface to Rust WASM functions

The WASM parser exposes `parse_save_internal_rust()` which returns deeply nested save data structures (see extensive TypeScript types in `wasm-wrapper.ts`).

### Data Flow

**Save File Loading**:
1. User provides save file via upload or continuous URL polling
2. `SaveFileSource` (Zustand store in `src/stores/save-file-source-store.ts`) manages source state and localStorage caching
3. `useEldenRingSaveQuery` (TanStack Query hook in `src/lib/er-save-file-query.ts`) fetches and parses save data
4. Web Worker (`er-save-parser.ts`) executes WASM parsing off main thread via Comlink
5. Parsed data populates UI components (sections, data tables, interactive map)

**Data Tables**:
- Shared store: `src/components/data-table/data-table-store.ts` (Zustand) persists column visibility, filters, sorting to localStorage
- Components in `src/components/data-table/` provide reusable table UI primitives
- Sections (`src/components/sections/`) compose data tables for specific game entities (inventory, events, regions, etc.)

### Routing

TanStack Router uses file-based routing:
- Routes defined in `src/routes/`
- `__root.tsx`: Root layout with app shell
- `index.tsx`: Main page composing all sections
- `routeTree.gen.ts`: Auto-generated route tree (do not edit manually)

Router config in `src/router.tsx` enables scroll restoration and prerendering.

### State Management

- **Zustand**: Used for client-side state stores (`save-file-source-store.ts`, `slot-selection-store.ts`, data table state)
- **TanStack Query**: Server state / async data caching
- **localStorage**: All stores sync to localStorage for persistence across sessions

### UI Components

- **Shadcn**: Component library (config in `components.json`)
- **Radix UI**: Headless primitives for accessibility
- **Tailwind v4**: Utility-first CSS via Vite plugin
- Components organized in `src/components/ui/` (shadcn), `src/components/sections/` (page sections), `src/components/data-table/` (table primitives)

## Key Files

- `vite.config.ts`: Vite setup with TanStack Start, WASM, image optimization, Tailwind v4
- `turbo.json`: Task orchestration and caching
- `flake.nix`: Nix development environment (Rust, wasm-pack, Bun, oxlint/oxfmt)
- `src/lib/wasm-wrapper.ts`: TypeScript types for Rust WASM save data structures
- `src/lib/er-save-file-query.ts`: Main save parsing query hook
- `src/stores/save-file-source-store.ts`: Save file source management

## Path Alias

TypeScript uses `@/*` path alias for `./src/*` (configured in `tsconfig.json` and `vite.config.ts`).

## Linting Configuration

- `.oxlintrc.json`: Ignores `packages/`, `docs/`, `scripts/`, `src/assets/`, `node_modules/`
- `.oxfmtrc.json`: oxfmt formatting config

## Common Patterns

- Data fetching: Use TanStack Query hooks, consider Web Workers for CPU-intensive operations
- State persistence: Zustand stores with localStorage sync
- Component composition: Sections compose data tables and UI primitives
- Type safety: Extensive TypeScript types generated from Rust WASM structures
