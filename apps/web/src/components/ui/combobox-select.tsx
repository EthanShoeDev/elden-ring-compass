import * as React from 'react';

import { Button } from '@/components/ui/button';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from '@/components/ui/combobox';
import { cn } from '@/lib/utils';

type Item = {
  label: string;
  value: string;
  dropDownItem?: React.ReactNode;
};

/**
 * Single-select dropdown with type-to-search, composed from the Base UI Combobox
 * primitives (button trigger + in-popup search — the "popup" pattern). A thin
 * convenience over `@/components/ui/combobox` for the common label/value list case.
 */
export function ComboboxSelect({
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
  const internalSelectedState = React.useState<string | undefined>(undefined);
  const [value, setValue] = valueState ?? internalSelectedState;
  const selected = items.find((item) => item.value === value) ?? null;

  return (
    <Combobox<Item, false>
      items={items}
      value={selected}
      onValueChange={(item) => setValue(item?.value)}
      itemToStringLabel={(item) => item.label}
      itemToStringValue={(item) => item.label}
    >
      <ComboboxTrigger
        render={
          <Button
            variant='outline'
            role='combobox'
            className={cn('justify-between font-normal', triggerButtonClassName)}
          />
        }
      >
        <span className='truncate'>{selected ? selected.label : placeholder}</span>
      </ComboboxTrigger>
      <ComboboxContent className={popoverContentClassName}>
        <ComboboxInput showTrigger={false} placeholder={placeholder} />
        <ComboboxEmpty>{emptyLabel}</ComboboxEmpty>
        <ComboboxList>
          {(item: Item) => (
            <ComboboxItem key={item.value} value={item}>
              {item.dropDownItem ?? item.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
