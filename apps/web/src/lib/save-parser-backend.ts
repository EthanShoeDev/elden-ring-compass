/**
 * Selects which save-parser backend the app uses: the Rust/WASM parser (default,
 * `'wasm'`) or the pure-TypeScript port (`'ts'`). Both are wired in the save-parser
 * worker and emit the identical lean DTO; this flag lets us roll the TS port out
 * gradually and A/B it before the WASM stack is deleted. See
 * `docs/projects/typescript-save-parser-port.md`.
 *
 * Resolution order (first match wins), all client-side:
 *   1. URL query `?parser=ts` | `?parser=wasm`
 *   2. localStorage key `er:parser-backend`
 *   3. default `'wasm'`
 */
export type SaveParserBackend = 'wasm' | 'ts';

const STORAGE_KEY = 'er:parser-backend';

function isBackend(v: string | null | undefined): v is SaveParserBackend {
  return v === 'wasm' || v === 'ts';
}

export function getSaveParserBackend(): SaveParserBackend {
  if (typeof window === 'undefined') return 'wasm';
  try {
    const fromQuery = new URLSearchParams(window.location.search).get('parser');
    if (isBackend(fromQuery)) return fromQuery;
    const fromStorage = window.localStorage.getItem(STORAGE_KEY);
    if (isBackend(fromStorage)) return fromStorage;
  } catch {
    // Non-browser / storage-disabled contexts fall through to the default.
  }
  return 'wasm';
}
