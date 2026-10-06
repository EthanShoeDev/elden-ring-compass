import { MapPinGlyph } from '@/components/icons/map-pin-glyph';
import { cn } from '@/lib/utils';

/**
 * The map-pin affordance that replaces the old select checkbox. A row's
 * "selection" is what drops it as a pin on the interactive map, so the control
 * reads as a pin: a hollow MapPin you can fill, an amber filled pin when pinned,
 * and a muted dash for rows with no extracted overworld location (those can't be
 * pinned — `row.getCanSelect()` is false). Mirrors the compass-app design kit's
 * `PinToggle`.
 */
type PinState = 'on' | 'ind' | 'off';

const PIN_STATE_CLASS: Record<PinState, string> = {
  on: 'border-amber-500/60 bg-amber-500/15 text-amber-400',
  ind: 'border-amber-500/40 text-amber-400/90 hover:bg-amber-500/10',
  off: 'border-input text-muted-foreground hover:border-amber-500/55 hover:bg-amber-500/10 hover:text-amber-400',
};

export function PinToggle({
  state,
  onToggle,
  title,
}: {
  state: PinState;
  onToggle: () => void;
  title: string;
}) {
  return (
    <button
      type='button'
      aria-label={title}
      title={title}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={cn(
        'inline-flex size-[30px] items-center justify-center rounded-md border transition-colors',
        PIN_STATE_CLASS[state],
      )}
    >
      <MapPinGlyph className='size-[15px]' filled={state === 'on'} />
    </button>
  );
}

export function PinUnavailable() {
  return (
    <span
      className='inline-flex size-[30px] items-center justify-center'
      title="No map data — can't be pinned"
    >
      <span className='block h-0.5 w-2.5 rounded-sm bg-muted-foreground/35' />
    </span>
  );
}
