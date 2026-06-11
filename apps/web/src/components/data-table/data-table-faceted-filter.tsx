import { PlusCircle as PlusCircledIcon } from 'lucide-react';
import { RowData } from '@tanstack/react-table';
import * as React from 'react';

import { DataTableColumn } from './table-hook';

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

type DataTableFacetedFilterProps<TData extends RowData, TValue> = {
  column?: DataTableColumn<TData, TValue>;
  title?: string;
  options: Array<FacetOption>;
};

const optionKey = (option: FacetOption) => JSON.stringify(option.value) ?? 'NA';

export function DataTableFacetedFilter<TData extends RowData, TValue>({
  column,
  title,
  options,
}: DataTableFacetedFilterProps<TData, TValue>) {
  // No `Subscribe` needed despite the `column.get*` reads: the toolbar rebuilds
  // `options` every render and re-renders per table state change (fresh `table`
  // ref), so this component's props always change identity alongside the state.
  const facets = column?.getFacetedUniqueValues();
  // The filter value is normally an `Array<value>` (faceted multi-select). The
  // inventory Quantity column additionally accepts the ownership presets the
  // segmented control writes (`'owned'` / `'missing'`) — interpret those into the
  // equivalent checked boxes so the toggle and this dropdown stay visibly linked.
  // Numeric: 'owned' = every value > 0, 'missing' = the 0 bucket.
  const rawFilterValue = column?.getFilterValue();
  const numericValues = options
    .map((o) => o.value)
    .filter((v): v is number => typeof v === 'number');
  const selectedValues =
    rawFilterValue === 'owned'
      ? new Set<unknown>(numericValues.filter((v) => v > 0))
      : rawFilterValue === 'missing'
        ? new Set<unknown>(numericValues.filter((v) => v === 0))
        : new Set(Array.isArray(rawFilterValue) ? rawFilterValue : []);

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

  // The aggregate row-count for a value. Rendered as a muted pill pushed to the far
  // right so it reads as secondary meta — for numeric columns the option label is
  // itself a number, and a bare right-aligned count was ambiguous (which number is
  // the value, which is the count?). The pill + `count ×` affordance disambiguates.
  const optionCount = (option: FacetOption) => {
    const count = facets?.get(option.value);
    return count ? (
      <span
        title={`${count} ${count === 1 ? 'item' : 'items'}`}
        className='ml-auto shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground tabular-nums'
      >
        {count}×
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
              <span className='min-w-0 flex-1 truncate'>{option.label}</span>
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
              <span className='min-w-0 flex-1 truncate'>{option.label}</span>
              {optionCount(option)}
            </ComboboxItem>
          )}
        </ComboboxList>
        {selectedValues.size > 0 && (
          <div className='border-t p-1'>
            <Button variant='ghost' size='sm' className='w-full justify-center' onClick={clear}>
              Clear filters
            </Button>
          </div>
        )}
      </ComboboxContent>
    </Combobox>
  );
}
