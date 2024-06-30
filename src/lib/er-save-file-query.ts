import { useSaveFileSourceStore } from '@/stores/save-file-source-store';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { delayMs } from './utils';

// const USE_WEB_WORKER = import.meta.env.USE_WEB_WORKER == 'true';

const worker = new ComlinkWorker<typeof import('./er-save-parser.js')>(
  new URL('./er-save-parser.js', import.meta.url),
  {
    name: 'EldenRingSaveParser',
    type: 'module',
  }
);
// USE_WEB_WORKER
//   ?
// : await import('./er-save-parser.js');

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
          const erData = worker.parseEldenRingData(src.file.buffer);
          return erData;
        }
        if ('url' in src) {
          console.time(`fetch(sr.url)`);
          const res = await fetch(src.url);
          console.timeEnd(`fetch(sr.url)`);
          console.time(`res.arrayBuffer()`);
          const buffer = await res.arrayBuffer();
          console.timeEnd(`arrayBuffer save`);
          try {
            setIsParsing(true);
            console.timeEnd('parseEldenRingData');
            const erData = await delayMs(10).then(() =>
              worker.parseEldenRingData(buffer)
            );
    
            return erData;
          } catch (err) {
            console.error(err);
            throw err instanceof Error ? err : new Error(String(err));
          } finally {
            console.timeEnd('parseEldenRingData');
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
