import { Schema } from 'effect';
import { Atom } from 'effect/reactivity';
import * as AsyncResult from 'effect/reactivity/AsyncResult';
import { useAtom, useAtomValue } from '@effect/atom-react';
import { useEffect } from 'react';
import { saveAtom, useEldenRingSave } from '@/lib/atoms/save';
import { appRuntime } from '@/lib/atoms/runtime';
import { saveFileSourceAtom } from '@/stores/save-file-source-store';

// In-session selected slot, as an index into `save.slots` (effect-atom; replaced
// the Zustand store). Indexed rather than keyed by character name: names aren't
// unique, and same-named characters must stay independently selectable (#10).
const selectedSlotIndexAtom = Atom.make<number | undefined>(undefined);

// Persisted memory of the chosen slot index per save, keyed by steam id (typesafe
// kvs, not raw localStorage).
const slotMemoryAtom = Atom.kvs({
  runtime: appRuntime,
  key: 'selectedSlotIndexBySteamId',
  schema: Schema.Record(Schema.String, Schema.Number),
  defaultValue: () => ({}),
});

export const useSlotSelection = () => {
  const { data } = useEldenRingSave();
  const [selectedSlotIndex, setSelectedSlotIndex] = useAtom(selectedSlotIndexAtom);
  const [slotMemory, setSlotMemory] = useAtom(slotMemoryAtom);

  useEffect(() => {
    if (selectedSlotIndex === undefined && data && data.slots.length > 0) {
      const cached = slotMemory[data.global_steam_id];
      setSelectedSlotIndex(cached !== undefined && cached < data.slots.length ? cached : 0);
    }
  }, [data, selectedSlotIndex, slotMemory, setSelectedSlotIndex]);

  const setSelectedSlot = (index: number) => {
    if (!data) return;
    setSlotMemory({ ...slotMemory, [data.global_steam_id]: index });
    setSelectedSlotIndex(index);
  };

  return [selectedSlotIndex, setSelectedSlot] as const;
};

export const useSelectedSlot = () => {
  const [slotIndex] = useSlotSelection();
  const { data } = useEldenRingSave();
  if (!data || slotIndex === undefined) return;
  return data.slots[slotIndex];
};

/**
 * Whether a save is currently being loaded — a source is set, the parse hasn't
 * failed, and no slot is selected yet. Bridges the gap between the Connect dialog
 * closing (e.g. "Use a sample save") and the parsed slot resolving, including the
 * brief window after a successful parse but before the slot-selection effect
 * above runs (so there's no flash of the Connect button). Derived atom — the
 * loading state lives in the effect-atom graph, not ad-hoc in components.
 */
const saveLoadingAtom = Atom.make((get) => {
  const source = get(saveFileSourceAtom);
  if (!source) return false;
  const result = get(saveAtom);
  if (AsyncResult.isFailure(result)) return false;
  if (!AsyncResult.isSuccess(result)) return true;
  return get(selectedSlotIndexAtom) === undefined;
});

export const useSaveLoading = () => useAtomValue(saveLoadingAtom);
