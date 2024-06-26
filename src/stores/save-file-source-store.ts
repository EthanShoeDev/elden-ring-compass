import { create } from 'zustand';

type FileData = {
  name: string;
  buffer: ArrayBuffer;
};

type FileUploadSource = {
  file: FileData;
};

type UrlSource = {
  url: string;
};

export type SaveFileSource = FileUploadSource | UrlSource;

type SaveFileSourceStoreState = {
  saveFileSource?: SaveFileSource;
  setSaveFileSource: (val?: SaveFileSource) => void;
};

const cachedUrl = localStorage.getItem('saveFileSourceUrl') ?? '/ER0000.sl2';

export const useSaveFileSourceStore = create<SaveFileSourceStoreState>()(
  (set) => ({
    saveFileSource: cachedUrl
      ? {
          url: cachedUrl,
        }
      : undefined,
    setSaveFileSource: (val) => {
      if (val && 'url' in val) {
        localStorage.setItem('saveFileSourceUrl', val.url);
      } else {
        localStorage.removeItem('saveFileSourceUrl');
      }
      set({ saveFileSource: val });
    },
  })
);
