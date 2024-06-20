import { playerNameBytesToString } from '@/lib/er-raw-db';
import { useEldenRingSaveQuery } from '@/lib/er-save-file-query';
import { useEffect } from 'react';
import { create } from 'zustand';

type SlotSelectionStoreState = {
  selectedSlot?: string;
  setSelectedSlot: (val?: string) => void;
};

const useSlotSelectionStore = create<SlotSelectionStoreState>()((set) => ({
  selectedSlot: undefined,
  setSelectedSlot: (val) => {
    set({ selectedSlot: val });
  },
}));

export const useSlotSelection = () => {
  const { query } = useEldenRingSaveQuery();
  const store = useSlotSelectionStore();

  useEffect(() => {
    if (
      store.selectedSlot === undefined &&
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
        store.setSelectedSlot(cachedSlotName);
      } else {
        store.setSelectedSlot(
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
    store.setSelectedSlot(val);
  };

  return [store.selectedSlot, setSelectedSlot] as const;
};
