import { CopyIcon } from 'lucide-react';
import { useRef } from 'react';
import { Button } from '../ui/button';

export function CodeSnippet({ children }: { children: string }) {
  const codeRef = useRef<HTMLPreElement>(null);
  return (
    <div className="relative rounded-lg bg-gray-950 p-4 font-mono text-gray-50">
      <pre className="whitespace-pre-wrap break-all" ref={codeRef}>
        <code>{children}</code>
      </pre>
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-2 text-gray-400"
        onClick={() => {
          void navigator.clipboard.writeText(
            codeRef.current?.textContent ?? ''
          );
        }}
      >
        <CopyIcon className="size-5" />
        <span className="sr-only">Copy code</span>
      </Button>
    </div>
  );
}
