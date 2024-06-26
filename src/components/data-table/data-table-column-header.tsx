import {
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  CaretSortIcon,
  EyeNoneIcon,
} from '@radix-ui/react-icons';
import { Column, Table } from '@tanstack/react-table';

import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import React from 'react';

type DataTableColumnHeaderProps<TData, TValue> = {
  column: Column<TData, TValue>;
  table: Table<TData>;
  title?: string;
} & React.HTMLAttributes<HTMLDivElement>;

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
  table,
}: DataTableColumnHeaderProps<TData, TValue>) {
  'use no memo';

  if (!column.getCanSort()) {
    return <div className={cn(className)}>{title}</div>;
  }

  title = title ?? column.id;

  const leafColumns = table.getAllLeafColumns();

  return (
    <div className={cn('flex items-center space-x-2', className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8 data-[state=open]:bg-accent"
          >
            <span>{title}</span>
            {column.getIsSorted() === 'desc' ? (
              <ArrowDownIcon className="ml-2 size-4" />
            ) : column.getIsSorted() === 'asc' ? (
              <ArrowUpIcon className="ml-2 size-4" />
            ) : (
              <CaretSortIcon className="ml-2 size-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem
            onClick={() => {
              column.toggleSorting(false);
            }}
          >
            <ArrowUpIcon className="mr-2 size-3.5 text-muted-foreground/70" />
            Asc
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              column.toggleSorting(true);
            }}
          >
            <ArrowDownIcon className="mr-2 size-3.5 text-muted-foreground/70" />
            Desc
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              column.toggleVisibility(false);
            }}
          >
            <EyeNoneIcon className="mr-2 size-3.5 text-muted-foreground/70" />
            Hide
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <div className="flex">
            <DropdownMenuItem
              className="grow"
              disabled={leafColumns.map((c) => c.id).indexOf(column.id) === 0}
              onClick={() => {
                const newOrder = leafColumns.map((c) => c.id);
                const currentIndex = newOrder.indexOf(column.id);
                newOrder.splice(currentIndex, 1);
                newOrder.splice(currentIndex - 1, 0, column.id);
                table.setColumnOrder(newOrder);
              }}
            >
              <ArrowLeftIcon className="mr-2 size-3.5 text-muted-foreground/70" />
            </DropdownMenuItem>
            <DropdownMenuItem
              className="grow justify-end"
              disabled={
                leafColumns.map((c) => c.id).indexOf(column.id) ===
                leafColumns.length - 1
              }
              onClick={() => {
                const newOrder = leafColumns.map((c) => c.id);
                const currentIndex = newOrder.indexOf(column.id);
                newOrder.splice(currentIndex, 1);
                newOrder.splice(currentIndex + 1, 0, column.id);
                table.setColumnOrder(newOrder);
              }}
            >
              <ArrowRightIcon className="ml-2 size-3.5 text-muted-foreground/70" />
            </DropdownMenuItem>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
