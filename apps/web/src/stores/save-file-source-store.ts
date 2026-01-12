import { create } from 'zustand';
import type { ShareableProgression } from '@/lib/share/types';

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

type SharedDataSource = {
  sharedData: ShareableProgression;
};

export type SaveFileSource = FileUploadSource | UrlSource | SharedDataSource;

type SaveFileSourceStoreState = {
  saveFileSource?: SaveFileSource;
  setSaveFileSource: (val?: SaveFileSource) => void;
};

const getCachedUrl = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('saveFileSourceUrl');
};

export const useSaveFileSourceStore = create<SaveFileSourceStoreState>()((set) => {
  const cachedUrl = getCachedUrl();
  return {
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
  };
});

// Type guards
export const isFileSource = (src?: SaveFileSource): src is FileUploadSource =>
  !!src && 'file' in src;

export const isUrlSource = (src?: SaveFileSource): src is UrlSource => !!src && 'url' in src;

export const isSharedSource = (src?: SaveFileSource): src is SharedDataSource =>
  !!src && 'sharedData' in src;
