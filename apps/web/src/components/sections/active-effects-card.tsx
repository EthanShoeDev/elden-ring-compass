import { activeEffectsDbView } from '@/lib/vm/active-effects';
import { useSelectedSlot } from '@/stores/slot-selection-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

/** Format a buff's remaining time; permanent/resident effects (≤0) show "—". */
const fmtTime = (t: number) => (t > 0 ? `${Math.round(t)}s` : '—');

/**
 * Active effects (`sp_effects`) on the selected character. Labelled via the
 * install-derived `SP_EFFECT_LABELS`; effects whose id has no known granting item
 * (mostly nested-leaf SpEffects, see the VM) are summarized as an unlabeled count.
 */
export function ActiveEffectsCard() {
  const slot = useSelectedSlot();
  const effects = activeEffectsDbView(slot);
  const labeled = effects.filter((e) => e.label !== null);
  const unlabeled = effects.length - labeled.length;

  return (
    <Card className='min-w-56'>
      <CardHeader>
        <CardTitle>Active Effects</CardTitle>
        <CardDescription>
          {effects.length} active{unlabeled > 0 ? ` · ${unlabeled} unlabeled` : ''}
        </CardDescription>
      </CardHeader>
      <CardContent className='flex flex-col gap-1'>
        {labeled.length ? (
          labeled.map((e, i) => (
            <div key={i} className='flex items-center justify-between gap-6 text-sm'>
              <span>{e.label}</span>
              <span className='text-xs text-muted-foreground'>{fmtTime(e.remainingTime)}</span>
            </div>
          ))
        ) : (
          <span className='text-sm text-muted-foreground'>
            {effects.length ? 'No labeled effects' : 'No active effects'}
          </span>
        )}
      </CardContent>
    </Card>
  );
}
