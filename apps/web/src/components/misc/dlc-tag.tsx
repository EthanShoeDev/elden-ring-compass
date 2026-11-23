import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/** Marks a boss, grace or item that Shadow of the Erdtree added. */
export function DlcTag({ className }: { className?: string | undefined }) {
  return (
    <Badge
      variant='outline'
      title='Shadow of the Erdtree'
      className={cn(
        'h-4 px-1.5 text-[10px] tracking-wide text-muted-foreground',
        className,
      )}
    >
      SotE
    </Badge>
  );
}
