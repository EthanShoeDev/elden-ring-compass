import React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { CommandList } from 'cmdk';

type Item = {
  label: string;
  value: string;
};

export function Combobox({
  placeholder,
  items,
  valueState,
  emptyLabel,
  triggerButtonClassName,
  popoverContentClassName,
}: {
  emptyLabel: string;
  placeholder: string;
  items: Array<Item>;
  valueState?: readonly [string | undefined, (val?: string) => void];
  triggerButtonClassName?: string;
  popoverContentClassName?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const internalSelectedState = React.useState<string | undefined>(undefined);
  const [value, setValue] = valueState ?? internalSelectedState;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('justify-between', triggerButtonClassName)}
        >
          {value
            ? items.find((item) => item.value === value)?.label
            : placeholder}
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn('p-0', popoverContentClassName)}>
        <Command>
          <CommandInput placeholder={placeholder} />
          <CommandEmpty>{emptyLabel}</CommandEmpty>
          <CommandGroup>
            <CommandList>
              {items.map((item) => (
                <CommandItem
                  key={item.value}
                  value={item.value}
                  onSelect={(currentValue) => {
                    setValue(currentValue === value ? '' : currentValue);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === item.value ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {item.label}
                </CommandItem>
              ))}
            </CommandList>
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
