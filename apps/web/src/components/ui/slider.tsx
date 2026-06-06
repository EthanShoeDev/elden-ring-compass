import { Slider as SliderPrimitive } from '@base-ui/react/slider';

import { cn } from '@/lib/utils';

/**
 * Slider — thin wrapper over Base UI's Slider, styled to match the shadcn
 * base-nova theme. Single-value by default; pass an array `value` for a range.
 */
function Slider({ className, ...props }: SliderPrimitive.Root.Props) {
  return (
    <SliderPrimitive.Root
      data-slot='slider'
      className={cn(
        'relative flex w-full touch-none items-center select-none data-disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Control className='flex w-full items-center py-1.5'>
        <SliderPrimitive.Track className='relative h-1.5 w-full grow overflow-hidden rounded-full bg-muted'>
          <SliderPrimitive.Indicator className='rounded-full bg-primary' />
          <SliderPrimitive.Thumb className='size-4 rounded-full border-2 border-background bg-primary shadow-sm ring-1 ring-border transition-transform outline-none focus-visible:ring-2 focus-visible:ring-ring/50 data-dragging:scale-110' />
        </SliderPrimitive.Track>
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  );
}

export { Slider };
