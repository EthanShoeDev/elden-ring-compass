import { PlusCircle as PlusCircledIcon } from 'lucide-react';
import { Column } from '@tanstack/react-table';
import * as React from 'react';

import { Badge } from '@/components/ui/badge';
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
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';

// Above this many options the dropdown gets a searchable Combobox; at or below it, a plain
// checkbox menu. Booleans/enums stay lightweight; high-cardinality columns (weight, Effects —
// hundreds of values) get type-to-filter.
const SEARCH_THRESHOLD = 8;

type FacetOption = {
  label: string;
  value: unknown;
  icon?: React.ComponentType<{ className?: string }>;
};

type DataTableFacetedFilterProps<TData, TValue> = {
  column?: Column<TData, TValue>;
  title?: string;
  options: Array<FacetOption>;
};

const optionKey = (option: FacetOption) => JSON.stringify(option.value) ?? 'NA';

export function DataTableFacetedFilter<TData, TValue>({
  column,
  title,
  options,
}: DataTableFacetedFilterProps<TData, TValue>) {
  'use no memo';
  const facets = column?.getFacetedUniqueValues();
  const selectedValues = new Set(column?.getFilterValue() as Array<unknown>);

  const setSelected = (values: Array<unknown>) =>
    column?.setFilterValue(values.length ? values : undefined);
  const toggle = (value: unknown) => {
    const next = new Set(selectedValues);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setSelected(Array.from(next));
  };
  const clear = () => column?.setFilterValue(undefined);

  const triggerInner = (
    <>
      <PlusCircledIcon className='mr-2 size-4' />
      {title}
      {selectedValues.size > 0 && (
        <>
          <Separator orientation='vertical' className='mx-2 h-4' />
          <Badge variant='secondary' className='rounded-sm px-1 font-normal lg:hidden'>
            {selectedValues.size}
          </Badge>
          <div className='hidden space-x-1 lg:flex'>
            {selectedValues.size > 2 ? (
              <Badge variant='secondary' className='rounded-sm px-1 font-normal'>
                {selectedValues.size} selected
              </Badge>
            ) : (
              options
                .filter((option) => selectedValues.has(option.value))
                .map((option) => (
                  <Badge
                    variant='secondary'
                    key={optionKey(option)}
                    className='rounded-sm px-1 font-normal'
                  >
                    {option.label}
                  </Badge>
                ))
            )}
          </div>
        </>
      )}
    </>
  );

  const optionCount = (option: FacetOption) => {
    const count = facets?.get(option.value);
    return count ? (
      <span className='ml-auto flex size-4 items-center justify-center font-mono text-xs'>
        {count}
      </span>
    ) : null;
  };

  // Small option sets: a plain Base UI checkbox menu (no search needed).
  if (options.length <= SEARCH_THRESHOLD) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant='outline' size='sm' className='h-8 border-dashed' />}
        >
          {triggerInner}
        </DropdownMenuTrigger>
        <DropdownMenuContent align='start' className='w-[12.5rem]'>
          {options.map((option) => (
            <DropdownMenuCheckboxItem
              key={optionKey(option)}
              checked={selectedValues.has(option.value)}
              closeOnClick={false}
              onCheckedChange={() => toggle(option.value)}
            >
              {option.icon && <option.icon className='mr-2 size-4 text-muted-foreground' />}
              <span>{option.label}</span>
              {optionCount(option)}
            </DropdownMenuCheckboxItem>
          ))}
          {selectedValues.size > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                closeOnClick={false}
                onClick={clear}
                className='justify-center text-center'
              >
                Clear filters
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // High-cardinality: searchable multi-select Combobox (Base UI native, button-triggered popup).
  return (
    <Combobox<FacetOption, true>
      items={options}
      multiple
      value={options.filter((option) => selectedValues.has(option.value))}
      onValueChange={(selected) => setSelected(selected.map((option) => option.value))}
      itemToStringLabel={(option) => option.label}
      itemToStringValue={(option) => option.label}
    >
      <ComboboxTrigger
        render={<Button variant='outline' size='sm' className='h-8 border-dashed' />}
      >
        {triggerInner}
      </ComboboxTrigger>
      <ComboboxContent>
        <ComboboxInput showTrigger={false} placeholder={title} />
        <ComboboxEmpty>No results found.</ComboboxEmpty>
        <ComboboxList>
          {(option: FacetOption) => (
            <ComboboxItem key={optionKey(option)} value={option}>
              {option.icon && <option.icon className='mr-2 size-4 text-muted-foreground' />}
              <span>{option.label}</span>
              {optionCount(option)}
            </ComboboxItem>
          )}
        </ComboboxList>
        {selectedValues.size > 0 && (
          <div className='border-t p-1'>
            <Button
              variant='ghost'
              size='sm'
              className='w-full justify-center'
              onClick={clear}
            >
              Clear filters
            </Button>
          </div>
        )}
      </ComboboxContent>
    </Combobox>
  );
}
