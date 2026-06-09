import { cn } from '@/lib/utils';

/**
 * A circular progress ring — the Overview's headline visual and the replacement for the old
 * empty avatar placeholder. Shows overall completion %, with the character's equipped-helm icon
 * (or a fallback label) in the center.
 */
export function CompletionRing({
  pct,
  size = 128,
  stroke = 10,
  centerIconUrl,
  centerLabel,
  className,
}: {
  pct: number;
  size?: number;
  stroke?: number;
  centerIconUrl?: string;
  /** Shown in the center when there's no helm icon (e.g. the big % itself, or a class initial). */
  centerLabel?: string;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, pct));
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference * (1 - clamped / 100);

  return (
    <div className={cn('relative shrink-0', className)} style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className='-rotate-90'
        aria-label={`${clamped}% complete`}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          className='fill-none stroke-muted'
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          strokeLinecap='round'
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className='fill-none stroke-primary transition-[stroke-dashoffset] duration-700'
        />
      </svg>
      <div className='absolute inset-0 flex flex-col items-center justify-center gap-0.5'>
        {centerIconUrl ? (
          <>
            <img
              src={centerIconUrl}
              alt=''
              className='size-1/2 object-contain drop-shadow'
              loading='lazy'
            />
            <span className='text-sm font-semibold tabular-nums'>{clamped}%</span>
          </>
        ) : (
          <>
            <span className='text-2xl font-bold tabular-nums leading-none'>{clamped}%</span>
            {centerLabel && (
              <span className='text-[11px] font-medium tracking-wide text-muted-foreground uppercase'>
                {centerLabel}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}
