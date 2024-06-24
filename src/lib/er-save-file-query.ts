import { useSaveFileSourceStore } from '@/stores/save-file-source-store';
import { useQuery } from '@tanstack/react-query';
import { parseEldenRingData } from './er-save-parser';
import { useState } from 'react';
import { delayMs } from './utils';

const parserWorker = new ComlinkWorker<typeof import('./er-save-parser')>(
  new URL('./er-save-parser', import.meta.url),
  {
    name: 'EldenRingSaveParser',
    type: 'module',
  }
);

export function useEldenRingSaveQuery() {
  const [isParsing, setIsParsing] = useState(false);
  const { saveFileSource } = useSaveFileSourceStore();
  const src = saveFileSource;
  return {
    query: useQuery({
      queryKey: ['er-save', src],
      staleTime: 30 * 1000,
      queryFn: async () => {
        if (!src) throw new Error('No source provided');
        if ('file' in src) {
          const erData = parseEldenRingData(src.file.buffer);
          return erData;
        }
        if ('url' in src) {
          const res = await fetch(src.url);
          const buffer = await res.arrayBuffer();
          try {
            setIsParsing(true);
            const erData = await delayMs(10).then(() =>
              parserWorker.parseEldenRingData(buffer)
            );
            return erData;
          } catch (err) {
            console.error(err);
            throw err instanceof Error ? err : new Error(String(err));
          } finally {
            setIsParsing(false);
          }
        }
        throw new Error('Invalid source');
      },
      enabled: !!src,
    }),
    isParsing,
  };
}
