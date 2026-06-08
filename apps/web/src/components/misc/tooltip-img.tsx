import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';

/**
 * A small icon that reveals a large version on hover. The table cell shows the
 * lightweight `thumbSrc` (an ~80px thumbnail, a few KB); the full-resolution
 * `imgSrc` (100–160KB) is only fetched when the tooltip opens — so a virtualized
 * table with hundreds of rows doesn't download the full image for every cell.
 * `thumbSrc` falls back to `imgSrc` when no thumbnail exists.
 */
export function TooltipImg({
  imgSrc,
  thumbSrc,
  alt,
}: {
  imgSrc: string;
  thumbSrc?: string | undefined;
  alt?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger>
        <img
          loading='lazy'
          decoding='async'
          className='size-10'
          src={thumbSrc ?? imgSrc}
          alt={alt}
        />
      </TooltipTrigger>
      <TooltipContent>
        {/* Mounts only when the tooltip opens, so `loading='lazy'` would just add
            latency — fetch eagerly + decode async instead. */}
        <img decoding='async' fetchPriority='high' className='size-64' src={imgSrc} alt={alt} />
      </TooltipContent>
    </Tooltip>
  );
}
