import { KeyValueStore } from 'effect/unstable/persistence';
import { Atom } from 'effect/unstable/reactivity';

// Shared effect-atom runtime providing a KeyValueStore backed by localStorage in
// the browser (in-memory on the server, for SSR). Persisted atoms use `Atom.kvs`
// on top of this so persistence is schema-validated and typesafe — never raw
// localStorage access.
export const browserKvsRuntime = Atom.runtime(
  typeof window === 'undefined'
    ? KeyValueStore.layerMemory
    : KeyValueStore.layerStorage(() => window.localStorage),
);
