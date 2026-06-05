import { SparklesIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * Shadow of the Erdtree toggle. Cosmetic for now — DLC boss/item data isn't
 * wired up yet (see docs/projects/future/, dlc-support). Kept in the chrome so
 * the layout matches the design and the switch is ready to drive DLC content
 * once it lands.
 */
export function DlcSwitch({ on, onToggle }: { on: boolean; onToggle: (on: boolean) => void }) {
  return (
    <button
      type='button'
      onClick={() => onToggle(!on)}
      data-on={on}
      title='Shadow of the Erdtree — DLC support in progress'
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-[12.5px] font-semibold transition-colors',
        on
          ? 'border-amber-500/50 bg-amber-500/10 text-amber-400'
          : 'border-border bg-card text-muted-foreground hover:text-foreground',
      )}
    >
      <SparklesIcon className='size-3.5' />
      <span>DLC</span>
      <span
        className={cn(
          'relative h-[17px] w-[30px] rounded-full transition-colors',
          on ? 'bg-amber-500' : 'bg-muted',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 size-[13px] rounded-full bg-white transition-all',
            on ? 'left-[15px]' : 'left-0.5',
          )}
        />
      </span>
    </button>
  );
}
