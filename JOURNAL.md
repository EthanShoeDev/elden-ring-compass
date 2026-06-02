# Engineering Journal

## 2026-01-12 03:30

### Documentation Framework Implementation

- **What**: Implemented Claude Conductor modular documentation system
- **Why**: Improve AI navigation and code maintainability
- **How**: Used `npx claude-conductor` to initialize framework
- **Issues**: None - clean implementation
- **Result**: Documentation framework successfully initialized

---

## 2026-06-01

### Monorepo tooling overhaul (oxlint/oxfmt/tsgo/jscpd/catalog) + dependency upgrade

- **What**: Rebuilt the repo tooling to mirror the reference monorepos in `docs/cloned-repos-as-docs` (clanker/fressh/listening-astro). Added root `oxlint.config.ts` (TS config, custom JS plugins, type-aware), `.oxfmtrc.jsonc` (single quotes), `.jscpd.json`, rewrote `turbo.jsonc` with a root-driven lint pipeline. New workspace packages: `@elden-ring-compass/config` (shared `tsconfig.base.json` with `@effect/language-service` strict diagnostics) and `@elden-ring-compass/oxlint-plugins` (`require-disable-description`, `forbidden-unknown-cast`, `prefer-effect`). Converted the root `package.json` to Bun object-workspaces with a `catalog`, and switched every workspace dep to `catalog:`. Added `scripts/catalog-check.ts` (Effect-based) to enforce catalog usage. Adopted tsgo via `@effect/tsgo` (`effect-tsgo patch` in `prepare`). Updated nearly all deps to latest stable (Vite 8, React 19.2, TanStack 1.17x, Tailwind 4.3, TypeScript 6, etc.); migrated `tailwindcss-animate` → `tw-animate-css`. Added a `nix:flake:update` script and ran it (nixpkgs → 2026-05-31).
- **Why**: Standardize tooling across Ethan's repos, enforce stricter lint/format/types, and modernize dependencies ahead of the Effect-TS conversion.
- **How**: Verified peer-dep alignment before pinning (e.g. `@vitejs/plugin-react@6` requires Vite 8; TanStack Start↔Router aligned). Fixed all resulting typecheck errors from `noUncheckedIndexedAccess` (kept ON) using `if` guards / a new `assertDefined` helper — the `!` non-null operator is now banned via `typescript/no-non-null-assertion`. Ported the reference repos' rule disables (react-perf, no-shadow, no-array-index-key, etc.) and hand-fixed the genuine remaining lint issues (a11y alt-text, floating promises, custom-rule hits).
- **Issues**: TypeScript 6 removed `downlevelIteration` (dropped it). `react-zoom-pan-pinch` v3→v4 renamed `onTransformed`→`onTransform` and changed the effect-context shape (fixed). One 1-line fix landed in `er-raw-db.ts` (a hand-written util in an otherwise do-not-edit dir) — flagged for review. `wasm-pack`/`@parcel/watcher` postinstalls left untrusted (not needed; Nix provides wasm-pack).
- **Result**: Full pipeline green — `bun run lint:check` passes (typecheck, oxfmt, jscpd 0 clones, oxlint 0 errors, catalog-check), and `bun run build` succeeds (Vite 8 + Nitro 3 + TanStack Start).

---
