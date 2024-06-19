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
  const store = useSlotSelectionStore();

  return [store.selectedSlot, store.setSelectedSlot] as const;
};
