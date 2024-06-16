import { useSaveFileSourceStore } from '@/stores/save-file-source-store';
import { useQuery } from '@tanstack/react-query';
import { parseEldenRingData, parseEldenRingUrl } from './er-save-parser';

export function useEldenRingSaveQuery() {
  const { saveFileSource } = useSaveFileSourceStore();
  const src = saveFileSource;
  return useQuery({
    queryKey: ['er-save', src],
    queryFn: async () => {
      if (!src) throw new Error('No source provided');
      if ('file' in src) {
        const erData = parseEldenRingData(src.file.buffer);
        return erData;
      }
      if ('url' in src) {
        const erData = await parseEldenRingUrl(src.url);
        return erData;
      }
      throw new Error('Invalid source');
    },
    enabled: !!src,
  });
}
