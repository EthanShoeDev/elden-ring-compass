import type { CSSProperties } from 'react';

/**
 * A map-pin glyph that keeps its inner dot visible even when filled.
 *
 * lucide's `MapPinIcon` fills BOTH the teardrop body and the inner circle with
 * the same colour under `fill="currentColor"`, so the dot vanishes into the body
 * and the pin reads as a featureless blob ("loses its internal lines"). Here the
 * filled state draws the body + inner circle as a single `fill-rule="evenodd"`
 * path, making the dot a true cut-out hole that shows the background through —
 * theme-agnostic, no colour assumptions. The shape matches the actual Leaflet map
 * markers (see `pinIcon` in `leaflet-map.tsx`) so legend swatches and pin toggles
 * line up with what's on the map.
 */
export function MapPinGlyph({
  filled = false,
  className,
  style,
}: {
  /** Selected/active state — fills the body but keeps the dot as a cut-out hole. */
  filled?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      width='24'
      height='24'
      viewBox='0 0 24 24'
      className={className}
      style={style}
      fill={filled ? 'currentColor' : 'none'}
      stroke='currentColor'
      strokeWidth={1.75}
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden='true'
    >
      {filled ? (
        // Body + inner circle as one path; even-odd makes the circle a hole.
        <path
          fillRule='evenodd'
          clipRule='evenodd'
          d='M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z M14.6 10a2.6 2.6 0 1 0-5.2 0 2.6 2.6 0 1 0 5.2 0Z'
        />
      ) : (
        <>
          <path d='M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z' />
          <circle cx='12' cy='10' r='2.6' />
        </>
      )}
    </svg>
  );
}
