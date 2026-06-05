// Dedicated Web Worker for the save parser — runs the pure-TS parser (via `er-save-parser.ts`)
// off the main thread for the ~28 MB parse. Plain `postMessage` protocol (no Comlink): the
// client posts a `ParseRequest` (a correlation id + the save buffer) and the worker replies with
// a `ParseResponse` (the lean DTO, or an error string). The `onmessage` listener is attached
// synchronously at module eval, so a request that arrives the instant the Worker is created is
// never dropped.
//
// This file is typechecked under the WebWorker lib (see tsconfig.worker.json / tsconfig.typecheck.json),
// so `self` is a `DedicatedWorkerGlobalScope` with the correct worker `onmessage`/`postMessage`
// signatures — no global-typing cast needed.
import { parseEldenRingData } from './er-save-parser';
import type {
  ParseRequest,
  ParseResponse,
} from './er-save-parser.protocol';

self.onmessage = (event: MessageEvent<ParseRequest>) => {
  const { id, buffer } = event.data;
  try {
    self.postMessage({
      id,
      ok: true,
      save: parseEldenRingData(buffer),
    } satisfies ParseResponse);
  } catch (err) {
    self.postMessage({
      id,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    } satisfies ParseResponse);
  }
};
