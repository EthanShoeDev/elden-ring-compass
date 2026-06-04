// Per-item icon URLs, owned by this package and resolved by the consuming bundler.
//
// The 2939 icons live in `images/icons/items/{iconId}.webp` (extractor output, Git LFS).
// Rather than copy them into the web app's `public/`, we let the bundler (Vite) hash and
// emit them as build assets: `import.meta.glob` over our own asset dir returns a map of
// path → resolved URL. Because this package is consumed as *source* (`exports` points at
// `./src/*.ts`), the glob is transformed in the consumer's module graph.
//
/// <reference types="vite/client" />

// Only Vite-based consumers (the web app, via `@elden-ring-compass/data/images`) import
// this module — the data barrel (`.`) does not, so node/test consumers never hit the glob.
//
// `import.meta.glob` is a Vite compile-time macro: it is statically replaced during transform
// and MUST be called directly (aliasing it to a variable breaks the replacement). The
// `vite/client` reference above types the macro so both this package's typecheck and the
// web app's see it identically.
const itemIconModules = import.meta.glob<string>(
  '../images/icons/items/*.webp',
  {
    query: '?url',
    import: 'default',
    eager: true,
  },
);

/** `{iconId}.webp` → hashed asset URL, keyed by the numeric icon id. */
export const ITEM_ICON_URL: ReadonlyMap<number, string> = new Map(
  Object.entries(itemIconModules).flatMap(([path, url]) => {
    const file = path.slice(path.lastIndexOf('/') + 1);
    const id = Number.parseInt(file, 10);
    return Number.isNaN(id) ? [] : [[id, url] as const];
  }),
);

/** Resolve an item `icon` id to its bundled URL, or `undefined` if no icon exists. */
export function itemIconUrl(iconId: number): string | undefined {
  return ITEM_ICON_URL.get(iconId);
}
