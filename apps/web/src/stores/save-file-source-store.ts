import { Schema } from 'effect';
import { Atom } from 'effect/unstable/reactivity';
import { browserKvsRuntime } from '@/lib/atoms/kvs';
import type { ShareableProgression } from '@/lib/share/types';
import sampleSaveUrl from '@elden-ring-compass/save-parser-ts/fixtures/ER0000.sl2?url';

type FileData = {
  name: string;
  buffer: ArrayBuffer;
};

type FileUploadSource = {
  file: FileData;
};

type UrlSource = {
  url: string;
};

type SharedDataSource = {
  sharedData: ShareableProgression;
};

export type SaveFileSource = FileUploadSource | UrlSource | SharedDataSource;

// Only the `url` source is durable — file buffers and shared payloads are
// session-only. We persist the url string (schema-validated) and keep the live
// source (file/shared/url) in a transient atom that takes precedence.
const persistedUrlAtom = Atom.kvs({
  runtime: browserKvsRuntime,
  key: 'saveFileSourceUrl',
  schema: Schema.String,
  defaultValue: () => '',
});

const transientSourceAtom = Atom.make<SaveFileSource | undefined>(undefined);

/**
 * Current save-file source (effect-atom; replaced the Zustand store). Reads the
 * in-session source if set, otherwise restores a persisted url. Writing persists
 * the url (or clears it) and updates the live source — the save-parse atom
 * (`@/lib/atoms/save`) derives from this directly.
 */
export const saveFileSourceAtom = Atom.writable<
  SaveFileSource | undefined,
  SaveFileSource | undefined
>(
  (get) => {
    const transient = get(transientSourceAtom);
    if (transient !== undefined) return transient;
    const url = get(persistedUrlAtom);
    return url ? { url: normalizePersistedUrl(url) } : undefined;
  },
  (ctx, value) => {
    // Set the transient source FIRST: the read fn short-circuits on a defined transient and never
    // reads `persistedUrlAtom`, so the subsequent persist below doesn't invalidate this derived
    // atom a second time. Setting persisted first would fire the save-parse atom twice (once with
    // transient still undefined → reads the new url, once after transient is set).
    ctx.set(transientSourceAtom, value);
    ctx.set(persistedUrlAtom, value && 'url' in value ? value.url : '');
  },
);

/**
 * The in-repo sample save — lets people explore a fully connected dashboard without owning the
 * game. It's the save-parser package's test fixture, imported as a Vite asset (not dropped in
 * `public/`) so it's content-hashed into `/assets/ER0000-{hash}.sl2` and served `immutable`: a
 * 28 MB file that returning visitors would otherwise re-validate on every load, and that would
 * be served stale for a year if a plain public path were marked immutable and the fixture ever
 * changed. It must stay OUTSIDE the app root: Nitro's dev router only hands requests with a
 * known asset extension (js/css/png/webp/…) to Vite, so an in-root `/src/…/ER0000.sl2` dev URL
 * falls through to SSR and 404s, whereas out-of-root files get a `/@fs/…` URL Nitro passes
 * straight through.
 */
export const SAMPLE_SAVE_URL: string = sampleSaveUrl;

/**
 * Persisted sample URLs from earlier deploys (`/ER0000.sl2` before it was fingerprinted, or a
 * previous hash) point at files that no longer exist. Any same-origin `ER0000*.sl2` url is ours,
 * so re-point it at the current sample. Absolute urls (e.g. a user's local file server) are
 * left alone.
 */
export const normalizePersistedUrl = (url: string): string =>
  url.startsWith('/') && /\/ER0000(-[\w-]+)?\.sl2$/.test(url) ? SAMPLE_SAVE_URL : url;

// Type guards
export const isFileSource = (src?: SaveFileSource): src is FileUploadSource =>
  !!src && 'file' in src;

export const isUrlSource = (src?: SaveFileSource): src is UrlSource => !!src && 'url' in src;

export const isSharedSource = (src?: SaveFileSource): src is SharedDataSource =>
  !!src && 'sharedData' in src;

/** Whether the active source is the bundled sample save (not the user's own). */
export const isSampleSource = (src?: SaveFileSource): src is UrlSource =>
  isUrlSource(src) && src.url === SAMPLE_SAVE_URL;
