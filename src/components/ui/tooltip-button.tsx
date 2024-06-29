import { ComponentProps } from 'react';
import { Button } from './button';
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip';

export function TooltipButton(
  props: ComponentProps<typeof Button> & { tooltip: string }
) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button {...props} />
      </TooltipTrigger>
      <TooltipContent sideOffset={8}>{props.tooltip}</TooltipContent>
    </Tooltip>
  );
}
