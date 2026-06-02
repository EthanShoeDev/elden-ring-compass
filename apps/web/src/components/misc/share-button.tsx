import { CheckIcon, ShareIcon } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../ui/button';
import { useSelectedSlot } from '@/stores/slot-selection-store';
import { useEldenRingSave } from '@/lib/atoms/save';
import { generateShareUrl } from '@/lib/share/encode';

export function ShareButton() {
  const [isCopied, setIsCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const slot = useSelectedSlot();
  const { isSharedView } = useEldenRingSave();

  // Don't show share button when already viewing shared data
  if (isSharedView || !slot) {
    return null;
  }

  const handleClick = async () => {
    try {
      setError(null);
      const url = generateShareUrl(slot);

      // Log URL length for monitoring
      console.log(`Share URL length: ${url.length} characters`);

      if (url.length > 8000) {
        setError('URL too long - try with fewer items');
        return;
      }

      await navigator.clipboard.writeText(url);
      setIsCopied(true);
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to generate share URL:', err);
      setError('Failed to copy');
    }
  };

  return (
    <Button
      variant='outline'
      className='flex gap-2'
      onClick={() => void handleClick()}
      title={error ?? 'Copy shareable link to clipboard'}
    >
      {isCopied ? (
        <>
          <CheckIcon className='size-4' />
          Copied!
        </>
      ) : error ? (
        <>
          <ShareIcon className='size-4' />
          {error}
        </>
      ) : (
        <>
          <ShareIcon className='size-4' />
          Share
        </>
      )}
    </Button>
  );
}
