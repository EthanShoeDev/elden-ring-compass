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
  const slot = useSlotSelectionStore((state) => state.selectedSlot);
  const setSlot = useSlotSelectionStore((state) => state.setSelectedSlot);
  return [slot, setSlot] as const;
};
