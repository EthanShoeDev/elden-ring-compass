import { CheckIcon, CopyIcon } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../ui/button';

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
    <Button className="size-6 p-0.5" size="icon" onClick={handleClick}>
      {isCopied ? (
        <CheckIcon className="size-4" />
      ) : (
        <CopyIcon className="size-4" />
      )}
    </Button>
  );
}

export function CopyCodeSnippet({ snippet }: { snippet: string }) {
  console.log('CopyCodeSnippet', snippet);
  return (
    <div className="flex items-center gap-2">
      <span className="bg-secondary p-1">{snippet}</span>
      <CopyButton value={snippet} />
    </div>
  );
}
