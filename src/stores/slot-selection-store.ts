import { playerNameBytesToString } from '@/lib/elden-ring-raw-db/er-raw-db';
import { useEldenRingSaveQuery } from '@/lib/er-save-file-query';
import { useEffect } from 'react';
import { create } from 'zustand';

type SlotSelectionStoreState = {
  selectedSlotName?: string;
  setSelectedSlotName: (val?: string) => void;
};

const useSlotSelectionStore = create<SlotSelectionStoreState>()((set) => ({
  selectedSlotName: undefined,
  setSelectedSlotName: (val) => {
    set({ selectedSlotName: val });
  },
}));

export const useSlotNameSelection = () => {
  const { query } = useEldenRingSaveQuery();
  const store = useSlotSelectionStore();

  useEffect(() => {
    if (
      store.selectedSlotName === undefined &&
      query.data &&
      query.data.slots.length > 0
    ) {
      const steamId = query.data.global_steam_id;
      const cachedSlotName = localStorage.getItem(`selectedSlot-${steamId}`);
      if (
        cachedSlotName &&
        query.data.slots.some(
          (s) =>
            playerNameBytesToString(s.player_game_data.character_name) ===
            cachedSlotName
        )
      ) {
        store.setSelectedSlotName(cachedSlotName);
      } else {
        store.setSelectedSlotName(
          playerNameBytesToString(
            query.data.slots[0].player_game_data.character_name
          )
        );
      }
    }
  }, [query.data, store]);

  const setSelectedSlot = (val?: string) => {
    if (!query.data) return;
    const steamId = query.data.global_steam_id;
    if (val) localStorage.setItem(`selectedSlot-${steamId}`, val);
    store.setSelectedSlotName(val);
  };

  return [store.selectedSlotName, setSelectedSlot] as const;
};

export const useSelectedSlot = () => {
  const [slotName] = useSlotNameSelection();
  const { query } = useEldenRingSaveQuery();
  if (!query.data) return;
  return query.data.slots.find(
    (slot) =>
      slotName === playerNameBytesToString(slot.player_game_data.character_name)
  );
};
