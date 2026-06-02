import { EyeIcon, UploadIcon } from 'lucide-react';
import { useAtomSet } from '@effect/atom-react';
import { Button } from '../ui/button';
import { useEldenRingSave } from '@/lib/atoms/save';
import { saveFileSourceAtom } from '@/stores/save-file-source-store';
import { playerNameBytesToString } from '@/lib/elden-ring-raw-db/er-raw-db';

export function SharedViewBanner() {
  const { data, isSharedView } = useEldenRingSave();
  const setSaveFileSource = useAtomSet(saveFileSourceAtom);

  if (!isSharedView || !data) {
    return null;
  }

  // Get the character name from the shared data
  const slot = data.slots[0];
  const characterName = slot
    ? playerNameBytesToString(slot.player_game_data.character_name)
    : 'Unknown';

  const handleLoadOwn = () => {
    setSaveFileSource(undefined);
  };

  return (
    <div className='flex items-center justify-between gap-4 bg-blue-600 px-3 py-2 text-white dark:bg-blue-800 md:px-6'>
      <div className='flex items-center gap-2'>
        <EyeIcon className='size-5' />
        <span className='font-medium'>
          Viewing <strong>{characterName}</strong>&apos;s shared progression
        </span>
      </div>
      <Button variant='secondary' size='sm' className='flex gap-2' onClick={handleLoadOwn}>
        <UploadIcon className='size-4' />
        Load your own
      </Button>
    </div>
  );
}
