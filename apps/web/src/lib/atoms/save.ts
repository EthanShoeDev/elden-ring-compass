import * as Comlink from 'comlink';
import { Cause, Data, Effect } from 'effect';
import { Atom } from 'effect/unstable/reactivity';
import * as AsyncResult from 'effect/unstable/reactivity/AsyncResult';
import { useAtomRefresh, useAtomValue } from '@effect/atom-react';
import { reconstructSlot } from '@/lib/share/decode';
import { getSaveParserBackend } from '@/lib/save-parser-backend';
import { isSharedSource, saveFileSourceAtom } from '@/stores/save-file-source-store';
import type { WasmEldenRingSave } from '@/lib/wasm-wrapper';

// Effect-atom replacement for the old React Query save hook. The Comlink
// Worker → Rust/WASM parse is wrapped as an Effect and exposed as an async Atom
// (`AsyncResult`), deriving from `saveFileSourceAtom`; when the source changes
// the parse re-runs automatically. No QueryClient / React Query.

class NoSaveSourceError extends Data.TaggedError('NoSaveSourceError')<object> {}
class SaveParseError extends Data.TaggedError('SaveParseError')<{ readonly message: string }> {}

type SaveParserWorker = {
  parseEldenRingData: (buffer: ArrayBuffer) => Promise<WasmEldenRingSave>;
  parseEldenRingDataTs: (buffer: ArrayBuffer) => Promise<WasmEldenRingSave>;
};

let workerApi: Comlink.Remote<SaveParserWorker> | null = null;
const getWorkerApi = (): Comlink.Remote<SaveParserWorker> | null => {
  if (typeof window === 'undefined') return null;
  if (!workerApi) {
    const worker = new Worker(new URL('../er-save-parser.worker.ts', import.meta.url), {
      name: 'EldenRingSaveParser',
      type: 'module',
    });
    workerApi = Comlink.wrap<SaveParserWorker>(worker);
  }
  return workerApi;
};

const toParseError = (cause: unknown) =>
  new SaveParseError({ message: cause instanceof Error ? cause.message : String(cause) });

// Counts how many times the parse atom executes, surfaced in the logs below so a re-parse storm
// (the atom re-running unexpectedly) is visible at a glance.
let parseRunCount = 0;

/** Async atom: parses the active save source via the WASM worker. */
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

    const api = getWorkerApi();
    if (!api) return yield* new SaveParseError({ message: 'Save parser unavailable' });

    const buffer =
      'file' in src
        ? src.file.buffer
        : yield* Effect.tryPromise({
            try: () => fetch(src.url).then((r) => r.arrayBuffer()),
            catch: toParseError,
          });

    const backend = getSaveParserBackend();
    const save = yield* Effect.tryPromise({
      try: () =>
        backend === 'ts'
          ? api.parseEldenRingDataTs(buffer)
          : api.parseEldenRingData(buffer),
      catch: toParseError,
    });
    yield* Effect.logInfo(`save parse #${parseRunCount}: success`).pipe(
      Effect.annotateLogs('slots', save.slots.length),
      Effect.annotateLogs('backend', backend),
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
