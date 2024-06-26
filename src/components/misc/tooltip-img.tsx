import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';

export function TooltipImg({ imgSrc, alt }: { imgSrc: string; alt?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger>
        <img className="size-10" src={imgSrc} alt={alt} />
      </TooltipTrigger>
      <TooltipContent>
        <img className="size-64" src={imgSrc} alt={alt} />
      </TooltipContent>
    </Tooltip>
  );
}
