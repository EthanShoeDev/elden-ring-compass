import * as Comlink from 'comlink';
import { useSaveFileSourceStore } from '@/stores/save-file-source-store';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { delayMs } from './utils';

// Only create worker in browser environment
const getWorkerApi = () => {
  if (typeof window === 'undefined') {
    return null;
  }
  const worker = new Worker(new URL('./er-save-parser.js', import.meta.url), {
    name: 'EldenRingSaveParser',
    type: 'module',
  });
  return Comlink.wrap(worker);
};

let workerApi: any = null;

export function useEldenRingSaveQuery() {
  const [isParsing, setIsParsing] = useState(false);
  const { saveFileSource } = useSaveFileSourceStore();
  const src = saveFileSource;
  return {
    query: useQuery({
      queryKey: ['er-save', src],
      staleTime: 1000 * 60 * 5, // 5 minutes
      queryFn: async () => {
        if (!src) throw new Error('No source provided');

        // Initialize worker API lazily in browser
        if (!workerApi) {
          workerApi = getWorkerApi();
        }

        if (!workerApi) {
          throw new Error('Worker API not available (server-side rendering)');
        }

        if ('file' in src) {
          const erData = await workerApi.parseEldenRingData(src.file.buffer);
          return erData;
        }
        if ('url' in src) {
          console.time(`fetch(sr.url)`);
          const res = await fetch(src.url);
          console.timeEnd(`fetch(sr.url)`);
          console.time(`res.arrayBuffer()`);
          const buffer = await res.arrayBuffer();
          console.timeEnd(`res.arrayBuffer()`);
          try {
            setIsParsing(true);
            console.time('parseEldenRingData()');
            const erData = await delayMs(10).then(() => workerApi.parseEldenRingData(buffer));

            return erData;
          } catch (err) {
            console.error(err);
            throw err instanceof Error ? err : new Error(String(err));
          } finally {
            void delayMs(0).then(() => {
              console.timeEnd('parseEldenRingData()');
            });
            setIsParsing(false);
          }
        }
        throw new Error('Invalid source');
      },
      enabled: !!src && typeof window !== 'undefined',
    }),
    isParsing,
  };
}
