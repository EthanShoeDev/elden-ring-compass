import { Cause, Data, Effect, Schema } from 'effect';
import { Atom } from 'effect/unstable/reactivity';
import * as AsyncResult from 'effect/unstable/reactivity/AsyncResult';
import { useAtomRefresh, useAtomValue } from '@effect/atom-react';
import { reconstructSlot } from '@/lib/share/decode';
import {
  ParseResponse,
  type ParseRequest,
} from '@/lib/er-save-parser.protocol';
import { isSharedSource, saveFileSourceAtom } from '@/stores/save-file-source-store';
import type { WasmEldenRingSave } from '@/lib/save-dto';

// Effect-atom replacement for the old React Query save hook. The Worker → pure-TS parse is
// wrapped as an Effect and exposed as an async Atom (`AsyncResult`), deriving from
// `saveFileSourceAtom`; when the source changes the parse re-runs automatically. No QueryClient
// / React Query, and no Comlink — a plain `postMessage` request/response (see the worker).

class NoSaveSourceError extends Data.TaggedError('NoSaveSourceError')<object> {}
class SaveParseError extends Data.TaggedError('SaveParseError')<{ readonly message: string }> {}

// Lazily-created parse worker + a request/response correlation map keyed by a monotonic id.
let worker: Worker | null = null;
let nextRequestId = 0;
const pending = new Map<
  number,
  { resolve: (save: WasmEldenRingSave) => void; reject: (err: Error) => void }
>();

const getWorker = (): Worker | null => {
  if (typeof window === 'undefined') return null;
  if (!worker) {
    worker = new Worker(new URL('../er-save-parser.worker.ts', import.meta.url), {
      name: 'EldenRingSaveParser',
      type: 'module',
    });
    worker.onmessage = (event: MessageEvent<unknown>) => {
      // postMessage erases types: validate the reply against the protocol schema before
      // trusting it (runs once per save load — see er-save-parser.protocol.ts).
      const decoded = Schema.decodeUnknownExit(ParseResponse)(event.data);
      if (decoded._tag === 'Failure') {
        // Malformed reply — best-effort reject the correlated request (if its id survived).
        const raw = event.data;
        const rawId =
          typeof raw === 'object' && raw !== null && 'id' in raw
            ? raw.id
            : undefined;
        if (typeof rawId === 'number') {
          const p = pending.get(rawId);
          if (p) {
            pending.delete(rawId);
            p.reject(new Error('Save parser returned a malformed response'));
          }
        }
        return;
      }
      const res = decoded.value;
      const p = pending.get(res.id);
      if (!p) return;
      pending.delete(res.id);
      if (res.ok) p.resolve(res.save);
      else p.reject(new Error(res.error));
    };
  }
  return worker;
};

const parseInWorker = (buffer: ArrayBuffer): Promise<WasmEldenRingSave> => {
  const w = getWorker();
  if (!w) return Promise.reject(new Error('Save parser unavailable'));
  const id = nextRequestId++;
  return new Promise<WasmEldenRingSave>((resolve, reject) => {
    pending.set(id, { resolve, reject });
    w.postMessage({ id, buffer } satisfies ParseRequest);
  });
};

const toParseError = (cause: unknown) =>
  new SaveParseError({ message: cause instanceof Error ? cause.message : String(cause) });

// Counts how many times the parse atom executes, surfaced in the logs below so a re-parse storm
// (the atom re-running unexpectedly) is visible at a glance.
let parseRunCount = 0;

/** Async atom: parses the active save source via the TS worker. */
export const saveAtom = Atom.make((get) =>
  Effect.gen(function* () {
    const src = get(saveFileSourceAtom);
    if (!src) return yield* new NoSaveSourceError();

    const sourceKind = isSharedSource(src) ? 'shared' : 'file' in src ? 'file' : 'url';
    parseRunCount += 1;
    yield* Effect.logInfo(`save parse #${parseRunCount}: start`).pipe(
      Effect.annotateLogs('source', sourceKind),
      Effect.annotateLogs('url', 'url' in src ? src.url : undefined),
    );

    // Shared link: reconstruct a minimal save from the compressed payload.
    if (isSharedSource(src)) {
      const slot = reconstructSlot(src.sharedData);
      yield* Effect.logInfo(`save parse #${parseRunCount}: success (shared)`);
      return {
        global_steam_id: '',
        character_steam_ids: [],
        slots: [slot as never],
      } satisfies WasmEldenRingSave;
    }

    if (!getWorker())
      return yield* new SaveParseError({ message: 'Save parser unavailable' });

    const buffer =
      'file' in src
        ? src.file.buffer
        : yield* Effect.tryPromise({
            try: () => fetch(src.url).then((r) => r.arrayBuffer()),
            catch: toParseError,
          });

    const save = yield* Effect.tryPromise({
      try: () => parseInWorker(buffer),
      catch: toParseError,
    });
    yield* Effect.logInfo(`save parse #${parseRunCount}: success`).pipe(
      Effect.annotateLogs('slots', save.slots.length),
    );
    return save;
  }),
);

/**
 * Adapter hook mirroring the shape the UI consumed from React Query. "No source"
 * is reported as idle (not an error) by masking on the source atom.
 */
export function useEldenRingSave() {
  const result = useAtomValue(saveAtom);
  const source = useAtomValue(saveFileSourceAtom);
  const refresh = useAtomRefresh(saveAtom);
  const hasSource = source !== undefined;

  const data = AsyncResult.isSuccess(result) ? result.value : undefined;
  const isError = hasSource && AsyncResult.isFailure(result);
  const error =
    isError && AsyncResult.isFailure(result)
      ? (Cause.squash(result.cause) as { readonly message?: string })
      : undefined;

  return {
    data,
    isError,
    error,
    isSuccess: AsyncResult.isSuccess(result),
    isLoading: hasSource && AsyncResult.isWaiting(result) && !AsyncResult.isSuccess(result),
    isFetching: hasSource && AsyncResult.isWaiting(result),
    dataUpdatedAt: AsyncResult.isSuccess(result) ? result.timestamp : undefined,
    refresh,
    isSharedView: isSharedSource(source),
  };
}
