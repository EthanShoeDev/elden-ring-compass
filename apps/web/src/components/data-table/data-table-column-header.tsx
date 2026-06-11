import {
  ArrowDown as ArrowDownIcon,
  ArrowLeft as ArrowLeftIcon,
  ArrowRight as ArrowRightIcon,
  ArrowUp as ArrowUpIcon,
  ChevronsUpDown as CaretSortIcon,
  EyeOff as EyeNoneIcon,
} from 'lucide-react';
import { RowData, Subscribe } from '@tanstack/react-table';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import React from 'react';
import { DataTableColumn, DataTableInstance } from './table-hook';

type DataTableColumnHeaderProps<TData extends RowData, TValue> = {
  column: DataTableColumn<TData, TValue>;
  table: DataTableInstance<TData>;
  title?: string;
} & React.HTMLAttributes<HTMLDivElement>;

export function DataTableColumnHeader<TData extends RowData, TValue>({
  column,
  title,
  className,
  table,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <div className={cn(className)}>{title}</div>;
  }

  title = title ?? column.id;

  // This component renders through a header context, where `column`/`table` are
  // stable references — the React Compiler may memoize it across table state
  // changes, so reads like `column.getIsSorted()` would go stale (the documented
  // v9 builder-API pitfall). `Subscribe` re-runs the JSX whenever the slices the
  // reads depend on change: `sorting` for the indicator, `columnOrder` for the
  // move-left/right enablement.
  return (
    <Subscribe
      source={table.store}
      selector={(s) => ({ sorting: s.sorting, columnOrder: s.columnOrder })}
    >
      {() => {
        const leafColumns = table.getAllLeafColumns();
        return (
          <div className={cn('flex items-center space-x-2', className)}>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant='ghost'
                    size='sm'
                    className='-ml-3 h-8 data-[state=open]:bg-accent'
                  />
                }
              >
                <span>{title}</span>
                {column.getIsSorted() === 'desc' ? (
                  <ArrowDownIcon className='ml-2 size-4' />
                ) : column.getIsSorted() === 'asc' ? (
                  <ArrowUpIcon className='ml-2 size-4' />
                ) : (
                  <CaretSortIcon className='ml-2 size-4' />
                )}
              </DropdownMenuTrigger>
              <DropdownMenuContent align='start'>
                <DropdownMenuItem
                  onClick={() => {
                    column.toggleSorting(false);
                  }}
                >
                  <ArrowUpIcon className='mr-2 size-3.5 text-muted-foreground/70' />
                  Asc
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    column.toggleSorting(true);
                  }}
                >
                  <ArrowDownIcon className='mr-2 size-3.5 text-muted-foreground/70' />
                  Desc
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    column.toggleVisibility(false);
                  }}
                >
                  <EyeNoneIcon className='mr-2 size-3.5 text-muted-foreground/70' />
                  Hide
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <div className='flex'>
                  <DropdownMenuItem
                    className='grow'
                    disabled={leafColumns.map((c) => c.id).indexOf(column.id) === 0}
                    onClick={() => {
                      const newOrder = leafColumns.map((c) => c.id);
                      const currentIndex = newOrder.indexOf(column.id);
                      newOrder.splice(currentIndex, 1);
                      newOrder.splice(currentIndex - 1, 0, column.id);
                      table.setColumnOrder(newOrder);
                    }}
                  >
                    <ArrowLeftIcon className='mr-2 size-3.5 text-muted-foreground/70' />
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className='grow justify-end'
                    disabled={
                      leafColumns.map((c) => c.id).indexOf(column.id) === leafColumns.length - 1
                    }
                    onClick={() => {
                      const newOrder = leafColumns.map((c) => c.id);
                      const currentIndex = newOrder.indexOf(column.id);
                      newOrder.splice(currentIndex, 1);
                      newOrder.splice(currentIndex + 1, 0, column.id);
                      table.setColumnOrder(newOrder);
                    }}
                  >
                    <ArrowRightIcon className='ml-2 size-3.5 text-muted-foreground/70' />
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      }}
    </Subscribe>
  );
}
