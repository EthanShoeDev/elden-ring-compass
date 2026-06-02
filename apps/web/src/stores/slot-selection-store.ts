import { Schema } from 'effect';
import { Atom } from 'effect/unstable/reactivity';
import { useAtom } from '@effect/atom-react';
import { useEffect } from 'react';
import { useEldenRingSave } from '@/lib/atoms/save';
import { browserKvsRuntime } from '@/lib/atoms/kvs';

// In-session selected slot name (effect-atom; replaced the Zustand store).
const selectedSlotNameAtom = Atom.make<string | undefined>(undefined);

// Persisted memory of the chosen slot per save, keyed by steam id (typesafe kvs,
// not raw localStorage).
const slotMemoryAtom = Atom.kvs({
  runtime: browserKvsRuntime,
  key: 'selectedSlotBySteamId',
  schema: Schema.Record(Schema.String, Schema.String),
  defaultValue: () => ({}) as Record<string, string>,
});

export const useSlotNameSelection = () => {
  const { data } = useEldenRingSave();
  const [selectedSlotName, setSelectedSlotName] = useAtom(selectedSlotNameAtom);
  const [slotMemory, setSlotMemory] = useAtom(slotMemoryAtom);

  useEffect(() => {
    if (selectedSlotName === undefined && data && data.slots.length > 0) {
      const steamId = data.global_steam_id;
      const cached = slotMemory[steamId];
      if (
        cached &&
        data.slots.some((s) => s.player_game_data.character_name === cached)
      ) {
        setSelectedSlotName(cached);
      } else {
        const firstSlot = data.slots[0];
        if (firstSlot) setSelectedSlotName(firstSlot.player_game_data.character_name);
      }
    }
  }, [data, selectedSlotName, slotMemory, setSelectedSlotName]);

  const setSelectedSlot = (val?: string) => {
    if (!data) return;
    const steamId = data.global_steam_id;
    if (val) setSlotMemory({ ...slotMemory, [steamId]: val });
    setSelectedSlotName(val);
  };

  return [selectedSlotName, setSelectedSlot] as const;
};

export const useSelectedSlot = () => {
  const [slotName] = useSlotNameSelection();
  const { data } = useEldenRingSave();
  if (!data) return;
  return data.slots.find((slot) => slotName === slot.player_game_data.character_name);
};
