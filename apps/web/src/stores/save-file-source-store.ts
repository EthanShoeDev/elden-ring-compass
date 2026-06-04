import { Schema } from 'effect';
import { Atom } from 'effect/unstable/reactivity';
import { browserKvsRuntime } from '@/lib/atoms/kvs';
import type { ShareableProgression } from '@/lib/share/types';

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
    return url ? { url } : undefined;
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

// Type guards
export const isFileSource = (src?: SaveFileSource): src is FileUploadSource =>
  !!src && 'file' in src;

export const isUrlSource = (src?: SaveFileSource): src is UrlSource => !!src && 'url' in src;

export const isSharedSource = (src?: SaveFileSource): src is SharedDataSource =>
  !!src && 'sharedData' in src;
