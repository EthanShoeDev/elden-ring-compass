# Improve Linting — react-compiler rules, knip, and the Rust oxc port

> **Status (2026-06-05): PLANNING.** Scopes a set of incremental improvements to the repo's
> lint/static-analysis stack. None of these block shipping; they tighten correctness coverage
> (React Compiler rules), kill dead code (knip), and track the native Rust react-compiler
> tooling that will eventually replace our Babel-based compiler pass and our partial lint rules.

## Current state (what we have today)

The lint stack is centralized at the repo root and run through turbo:

- **oxlint** `1.68.0` — `oxlint -c oxlint.config.ts --type-aware --type-check` (type-aware rules
  via `oxlint-tsgolint`). Plugins enabled: eslint, typescript, unicorn, oxc, import, jsdoc,
  node, promise, react, react-perf, jsx-a11y.
- **3 custom JS plugins** already wired via `jsPlugins` in `oxlint.config.ts`
  (`@elden-ring-compass/oxlint-plugins/*`: require-disable-description, forbidden-unknown-cast,
  prefer-effect). **This matters: the repo already runs oxlint JS plugins**, so adding more is a
  known, low-friction path.
- **oxfmt** `0.53.0` — formatting (owns import ordering).
- **jscpd** — copy/paste detection.

**React Compiler lint coverage today** (see the [react-compiler enablement work] and the
`react_compiler_oxc` discussion below): we enabled the React Compiler build pass via
`@rolldown/plugin-babel` + `babel-plugin-react-compiler@1`, and in `oxlint.config.ts` we turned
on the two foundational native rules:

- `react/exhaustive-deps` — on (via the `correctness` category).
- `react/rules-of-hooks` — **explicitly promoted to `error`** (it is OFF by default in oxlint;
  not part of any enabled category). This is the rule the compiler silently bails on.

What we **don't** have natively in oxlint: the deeper React Compiler diagnostics
(`set-state-in-effect`, `immutability`, `preserve-manual-memoization`, `purity`, `refs`,
`incompatible-library`, …). oxlint **has no native `react-compiler` plugin** — that rule set does
not exist in oxlint 1.68.0. Those rules can only be run today via the JS-plugin path (Task 2) or
once the native Rust port lands (Task 3).

## Tasks

### Task 1 — Set up and properly configure knip — _DONE (2026-06-09)_

**Goal:** find and remove dead code, unused dependencies, unused exports, and unused files across
the monorepo. We have none of this today; it's the highest-value addition because it catches a
category nothing else does (oxlint flags unused _locals_, not unused _exports/files/deps_).

**Status:** `knip` (catalog-pinned) is wired in via `knip.ts` (typed `KnipConfig`, modelled on the
listening-astro reference) + the `//#knip:check` root turbo task, which now runs inside both
`//#lint:root` and `//#lint:check:root`. Config notes:

- Bun catalogs and `workspace:*` are resolved natively; `knip.ts` is deliberately minimal — **no
  fake entry points**. The save-parser worker is auto-detected (`new Worker(new URL(...))`); the
  only real entries are root `scripts/*.ts` (map-calibrate isn't a stage yet) and the save-parser
  `perf/*.bench.ts` benchmark. Ignores: the vendored `**/components/ui/**`, the `assert` polyfill
  alias, the `nix` binary, and the extractor's `git` subcommand mis-parse. Generated code is
  excluded by knip's own plugins.
- The dead `app.tsx` (pre-Start `<RouterProvider>` bootstrap — the framework hydrates via
  `__root.tsx` + `router.tsx`; confirmed by a clean build) was **deleted**, not entry-listed.
- `bun-types` was an unresolved-import false-positive: the tsconfigs' `types: ["node","bun-types"]`
  resolved only transitively. Switched to `["node","bun"]` (→ the declared `@types/bun`), so no
  `ignoreUnresolved` is needed.
- The extractor's `ignoreExportsUsedInFile` is the one scoped exception: its pipeline stages are
  Effect values whose inferred types name internal errors/interfaces, and `declaration: true`
  (tsconfig.base) forces those to stay `export`ed even though nothing imports them by name. (They
  are package-internal, not a cross-workspace public API — the extractor only exposes a `bin`.)
- **All issue types block the gate** (default severity — no `rules` overrides). The baseline was
  cleaned first (below), so files/exports/types are now counted, not warn-only.
- `knip --fix` is a no-op in this repo (it rewrites neither `catalog:`-protocol deps nor `export`
  keywords here), so fixes are applied by hand.
- Coexists with `scripts/catalog-check.ts`: catalog-check enforces that _used_ deps reference the
  catalog; knip removes catalog entries nothing references. Non-overlapping, verified both pass.

**Baseline cleanup done in the same pass** (knip now runs clean — `typecheck`, `oxlint`, and the
web/save-parser/extractor test suites all green):

- **Dead dependencies removed:** `wasm-pack` (WASM parser deleted), `@tanstack/react-query` +
  `zustand` (data-layer rework), `@faker-js/faker`, `react-markdown`, `@types/lz-string`.
- **Dead files deleted:** the superseded `weapons-data-table`, `copy-button`, `share-button`,
  `quests-section`, `dlc-switch`, the `share/index` barrel, and the `SlotSelector`/`RefreshButton`
  controls (replaced by `SlotSwitcher`).
- **Dead exports/symbols deleted:** the cascaded weapons atoms, the orphaned share-encoder
  (`extractShareableData`/`generateShareUrl` — sharing is view-only until the Share button is
  re-wired), a batch of unused `save-dto` aliases, etc.
- **Over-exports unexported:** ~30 symbols that were `export`ed but only used within their own file
  lost the `export` keyword (mostly `packages/extractor` internals).
- **Effect runtime now actually used for logging** (so it isn't flagged): `clientRuntime` runs the
  worker parse path; a new isomorphic `lib/runtime/log.ts` routes `decode.ts` logging through
  `clientRuntime`/`serverRuntime` per environment (`import.meta.env.SSR`, tree-shaken per bundle).
- **Reserved-not-dead** kept as knip entries: `lib/er-objectives.ts` (future quest-compass data).

Considerations specific to this repo:

- **Monorepo-aware.** knip supports workspaces; point it at `apps/*`, `packages/*`,
  `packages/config/*` (same globs as the bun workspace in root `package.json`).
- **Entry points that look unreferenced but aren't** — must be declared so knip doesn't flag
  them: TanStack Start route files + `routeTree.gen.ts`, vite/vitest config files, vite plugins
  (`apps/web/vite-plugins/*`), the oxlint JS plugins (`packages/config/oxlint-plugins/*`), the
  extractor codegen entry, worker entry points (save-parser worker), and `scripts/*`.
- **Generated/vendored code must be ignored** — mirror the `ignorePatterns` already in
  `oxlint.config.ts`: `packages/data/src/generated/**`, `apps/web/src/assets/erdb/**`,
  `apps/web/src/lib/elden-ring-raw-db/**`, `**/components/ui/**` (shadcn vendored),
  `*.gen.*`, `docs/cloned-repos-as-docs/**`.
- **Catalog/workspace deps** — the repo uses bun `catalog:` + `workspace:*`. Verify knip resolves
  these correctly (it reads from `package.json`); coordinate with the existing
  `scripts/catalog-check.ts` so the two don't fight over what "unused" means.
- **Wire into turbo + scripts** — add a `knip` / `knip:check` root script and a turbo task,
  consistent with `oxlint:check` / `oxfmt:check` / `jscpd:check`. Decide CI severity: start as a
  **report-only** (non-blocking) pass, tighten to blocking once the baseline is clean.

**Done when:** `knip` runs clean (or with an explicitly-reviewed, documented allowlist), is wired
into the lint task group, and a first pass of genuinely-dead code/deps has been removed.

### Task 2 — Add the full React Compiler rule set via oxlint JS plugin (works today)

**Goal:** get the complete `eslint-plugin-react-hooks` v6 / React Compiler diagnostic set
(`set-state-in-effect`, `immutability`, `preserve-manual-memoization`, `purity`, `refs`,
`incompatible-library`, `error-boundaries`, `globals`, `static-components`, etc.) running in
oxlint **now**, on top of the two native rules we already enabled.

**How:** oxlint's JS-plugin integration runs the actual JS React-Hooks rules. Reference
implementation: **[TheAlexLichter/oxlint-react-compiler-rules]** (demo repo), with a
comprehensive rule list compiled at its [issue #1]. The repo **already uses `jsPlugins`**, so this
is additive config, not new machinery. oxlint also now supports **dynamic `extends` configs**
(JS-authored shared configs) — worth using so we consume a maintained rule list instead of hand-
pinning ~26 rule names that churn as the compiler evolves.

**The tradeoff — this is the reason it's a deliberate task, not a default:**

- JS plugins run in JS, not Rust, so they **slow the lint down**. Real data point from the oxc
  issue thread: a project went from **0.8s → 4.5s** after adding the react-compiler JS rules.
  Measure our own delta before committing — this repo's posture is _fast_ lint (oxlint +
  tsgolint), and a ~5× lint slowdown is a real cost.
- The native `react/rules-of-hooks` + `react/exhaustive-deps` we already run cover the violations
  that actually make the compiler _bail_. The JS-plugin rules add the subtler purity/effect
  diagnostics that surface problems _before_ the build-time bailout logs.

**Decision lean:** opt-in / staged. Options to keep it from taxing every lint run:

- a **separate script + turbo task** (e.g. `lint:react-compiler`) run in CI and on-demand, not in
  the hot `oxlint:check` path; or
- accept the slowdown repo-wide only if measured delta is small on our file count.

Also confirm **editor integration** — the oxc VSCode extension gained JS-plugin support (per the
thread); verify the react-compiler rules surface in-editor, not just in CI.

**Note for future-proofing:** when the native Rust rules land (Task 3), this JS-plugin layer
should be **removed**, not kept in parallel — it's a stopgap for exactly the gap Task 3 closes.

### Task 3 — Track / adopt the native Rust React Compiler (oxc) — _not usable today_

**What it is:** the React team is porting React Compiler to Rust, with native **oxc** and **swc**
integrations. This is the thing that eventually replaces _both_ our Babel build pass
(`@rolldown/plugin-babel` + `babel-plugin-react-compiler`) _and_ the JS-plugin lint rules from
Task 2 — at native speed, in a single toolchain.

**Status as of 2026-06-05 (verified):**

- Tracking issue: **[oxc-project/oxc#10048]** "React Compiler oxc plugin" — OPEN since Mar 2025.
- Implementation PR: **[facebook/react#36173]** "[compiler] Port React Compiler to Rust" — OPEN,
  branch `pr-36173`/`rust-research`. Experimental, work-in-progress, "majority coded by AI" with
  human-guided architecture (@josephsavona, @poteto, @mvitousek, @mofeiZ).
- **No npm builds exist.** The PR body states plainly: _"No builds available yet, you'll have to
  do some hacking if you want to try this."_ Confirmed: `babel-plugin-react-compiler-rust`,
  `@oxc-project/react-compiler`, `oxc-react-compiler` are all unpublished; published
  `oxc-transform` (`0.134.0`) does **not** include the react compiler transform.
- The `react_compiler_oxc` and `react_compiler_swc` crates are **example integrations inside the
  PR**, not packages. Trying it today = check out the branch and build from source.
- Meta is running it internally: ~**99.9% output parity** with the TS compiler, ~**25% faster**
  (Babel-plugin mode, including serialization cost; native integrations should be faster). They
  signaled "ready to merge within a week or two" (as of early June 2026).
- A separate community native-oxlint POC exists too: **Brooooooklyn**'s
  `react-compiler` oxlint plugin on the oxc branch `cursor/react-compiler-rust-port-7c74` (all ~26
  rules, 508ms/844 files) — deferring to the official React-team implementation.

**The realistic drop-in path** (when to actually touch this) is a chain of hops, none done yet:

1. React PR #36173 merges → React publishes `babel-plugin-react-compiler-rust` (or folds the Rust
   backend into `babel-plugin-react-compiler`). **First cheap experiment:** point our existing
   `@rolldown/plugin-babel` preset at the Rust Babel plugin — a one-package swap, reversible,
   still a Babel pass but ~25% faster.
2. oxc ships `react_compiler_oxc` inside a **published** `oxc-transform`.
3. `@vitejs/plugin-react` exposes it on its rolldown path → replaces our `@rolldown/plugin-babel`
   setup with a one-line swap, and the JS-plugin lint rules (Task 2) get native equivalents.

**This task is "watch + adopt," not "build."** Action now: monitor PR #36173 state + npm for
`babel-plugin-react-compiler-rust`. Revisit when step 1 lands.

## Other linting improvements (backlog / lower priority)

- **Audit oxlint rule deviations** — `oxlint.config.ts` carries a block of rules disabled "for
  parity with reference monorepos (fressh, listening-astro)." Some (e.g. the `react-perf/*`
  family) were turned off on the rationale _"rely on the React Compiler / profiling instead"_ —
  now that the compiler is actually enabled, re-confirm those are still the right calls.
- **CI gating consistency** — ensure knip + (optional) react-compiler JS rules sit in the same
  turbo/CI group as `oxlint:check`/`oxfmt:check`/`jscpd:check`, with a clear blocking vs.
  report-only policy per check.
- **Editor parity** — keep the oxc VSCode extension config in sync with whatever JS plugins CI
  runs, so contributors see the same diagnostics locally.

## References

- React Compiler enablement (build pass + native oxlint rules) — done; this doc is the follow-on.
- [oxc-project/oxc#10048] — native oxc React Compiler tracking issue (the full thread, incl.
  Evan You's "use a separate Babel pass" short-term recommendation, which is what our build
  currently does).
- [facebook/react#36173] — the Rust port PR.
- [TheAlexLichter/oxlint-react-compiler-rules] + [issue #1] — JS-plugin rule list for Task 2.
- React blog, 2025-10-07: _React Compiler 1.0_ — incl. migrating
  `eslint-plugin-react-compiler` → `eslint-plugin-react-hooks`.
- [knip] — https://knip.dev

[react-compiler enablement work]: ../../../apps/web/vite.config.ts
[oxc-project/oxc#10048]: https://github.com/oxc-project/oxc/issues/10048
[facebook/react#36173]: https://github.com/facebook/react/pull/36173
[TheAlexLichter/oxlint-react-compiler-rules]: https://github.com/TheAlexLichter/oxlint-react-compiler-rules
[issue #1]: https://github.com/TheAlexLichter/oxlint-react-compiler-rules/issues/1
[knip]: https://knip.dev
