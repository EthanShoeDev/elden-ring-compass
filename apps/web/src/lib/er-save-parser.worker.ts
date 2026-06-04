// Dedicated Web Worker for the save parser — runs the pure-TS parser (via `er-save-parser.ts`)
// off the main thread for the ~28 MB parse. Plain `postMessage` protocol (no Comlink): the
// client posts a `ParseRequest` (a correlation id + the save buffer) and the worker replies with
// a `ParseResponse` (the lean DTO, or an error string). The `onmessage` listener is attached
// synchronously at module eval, so a request that arrives the instant the Worker is created is
// never dropped.
import { parseEldenRingData } from './er-save-parser';
import type { WasmEldenRingSave } from './save-dto';

export type ParseRequest = { readonly id: number; readonly buffer: ArrayBuffer };
export type ParseResponse =
  | { readonly id: number; readonly ok: true; readonly save: WasmEldenRingSave }
  | { readonly id: number; readonly ok: false; readonly error: string };

// Minimal typed view of the worker global (avoids needing the "WebWorker" tsconfig lib).
const ctx = self as unknown as {
  onmessage: ((event: MessageEvent<ParseRequest>) => void) | null;
  postMessage: (message: ParseResponse) => void;
};

ctx.onmessage = (event) => {
  const { id, buffer } = event.data;
  try {
    ctx.postMessage({ id, ok: true, save: parseEldenRingData(buffer) });
  } catch (err) {
    ctx.postMessage({
      id,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
};
