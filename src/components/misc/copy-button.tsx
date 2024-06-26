import { useState } from 'react';
import { Button } from '../ui/button';
import { CheckIcon, CopyIcon } from 'lucide-react';

export function CopyButton({ value }: { value: string }) {
  const [isCopied, setIsCopied] = useState(false);

  const handleClick = () => {
    void navigator.clipboard.writeText(value).then(() => {
      setIsCopied(true);
      setTimeout(() => {
        setIsCopied(false);
      }, 1000);
    });
  };

  return (
    <Button className="p-0.5" size="icon" onClick={handleClick}>
      {isCopied ? (
        <CheckIcon className="size-4" />
      ) : (
        <CopyIcon className="size-4" />
      )}
    </Button>
  );
}
