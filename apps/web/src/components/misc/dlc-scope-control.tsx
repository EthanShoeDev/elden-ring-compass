import { Array as Arr, Schema } from 'effect';

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { DLC_SCOPE_LABEL, DlcScope } from '@/lib/dlc';
import { useDlcScope } from '@/lib/dlc-scope';
import { cn } from '@/lib/utils';

const isDlcScope = Schema.is(DlcScope);

const OPTIONS: readonly { value: DlcScope; label: string }[] = [
  { value: 'base', label: 'Base' },
  { value: 'dlc', label: 'DLC' },
  { value: 'all', label: 'All' },
];

/** Whether the selected character has started Shadow of the Erdtree. */
function DlcStatus({ started }: { started: boolean }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={<span />}
        className='hidden items-center gap-1.5 text-xs whitespace-nowrap text-muted-foreground md:flex'
      >
        <span
          className={cn(
            'size-1.5 rounded-full',
            started ? 'bg-primary' : 'bg-muted-foreground/40',
          )}
        />
        SotE {started ? 'entered' : 'not started'}
      </TooltipTrigger>
      <TooltipContent className='max-w-64'>
        {started
          ? 'This character has entered the Land of Shadow.'
          : 'This character hasn’t entered the Land of Shadow. The save can’t tell whether the DLC is owned — only whether it has been started.'}
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Base game / DLC / All content filter for every table, completion total and map
 * quick-select. Defaults from the save until the viewer picks one.
 */
export function DlcScopeControl() {
  const { scope, setScope, started, isAutomatic } = useDlcScope();
  return (
    <div className='flex shrink-0 items-center gap-2'>
      {started !== undefined && <DlcStatus started={started} />}
      <ToggleGroup
        aria-label='Content shown'
        variant='outline'
        size='sm'
        value={[scope]}
        onValueChange={(v) => {
          const next = v.at(-1);
          if (isDlcScope(next)) setScope(next);
        }}
      >
        {Arr.map(OPTIONS, (o) => (
          <ToggleGroupItem
            key={o.value}
            value={o.value}
            title={`${DLC_SCOPE_LABEL[o.value]}${
              isAutomatic && o.value === scope ? ' (from your save)' : ''
            }`}
            className='px-2 text-xs aria-pressed:border-primary/60 aria-pressed:bg-primary/10 aria-pressed:text-foreground'
          >
            {o.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}
