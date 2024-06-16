import { create } from 'zustand';

type FileUploadSource = {
  file: File;
};

type UrlSource = {
  url: string;
};

export type SaveFileSource = FileUploadSource | UrlSource;

type SaveFileSourceStoreState = {
  saveFileSource?: SaveFileSource;
  setSaveFileSource: (val?: SaveFileSource) => void;
};

export const useSaveFileSourceStore = create<SaveFileSourceStoreState>()(
  (set) => ({
    saveFileSource: undefined,
    setSaveFileSource: (val) => {
      set({ saveFileSource: val });
    },
  })
);
