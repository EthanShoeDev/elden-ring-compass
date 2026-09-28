import { Layer } from 'effect';
import { FetchHttpClient, HttpClient } from 'effect/http';
import { KeyValueStore } from 'effect/persistence';
import { Atom } from 'effect/reactivity';

// The web app's shared effect-atom runtime — the Effect ↔ React interop point.
// Atoms built on it (`appRuntime.atom(...)`, `Atom.kvs({ runtime: appRuntime })`) get:
//   • KeyValueStore — localStorage in the browser (in-memory on the server, for SSR), so
//     persisted atoms are schema-validated and typesafe; never raw localStorage access.
//   • HttpClient — the platform `fetch`; UI code never calls `fetch` directly. Tracer
//     propagation is off: there is no tracing backend, and the `traceparent` header it adds
//     makes cross-origin APIs (GitHub) fail their CORS preflight.
// An atom's fiber is interrupted when its last subscriber unmounts, so an in-flight request
// is cancelled with the component that wanted it (no hand-rolled AbortController).
// Wrap client-only fetch atoms in `Atom.withServerValueInitial` so SSR renders the loading
// state instead of running the request on the server.
//
// Distinct from `clientRuntime` (lib/runtime/client.ts), a ManagedRuntime for running effects
// at non-React boundaries (the save-parser worker, DOM handlers).
const keyValueStore =
  typeof window === 'undefined'
    ? KeyValueStore.layerMemory
    : KeyValueStore.layerStorage(() => window.localStorage);

export const appRuntime = Atom.runtime(
  Layer.mergeAll(
    keyValueStore,
    FetchHttpClient.layer,
    Layer.succeed(HttpClient.TracerPropagationEnabled, false),
  ),
);
