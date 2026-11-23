import type { RowData } from '@tanstack/react-table';
import { Array as Arr } from 'effect';
import { SlidersHorizontal as MixerHorizontalIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import type { DataTableInstance } from './table-hook';

type DataTableViewOptionsProps<TData extends RowData> = {
  table: DataTableInstance<TData>;
};

export function DataTableViewOptions<TData extends RowData>({
  table,
}: DataTableViewOptionsProps<TData>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant='outline'
            size='sm'
            className='ml-auto hidden h-8 lg:flex'
          />
        }
      >
        <MixerHorizontalIcon className='mr-2 size-4' />
        View
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-[150px]'>
        <DropdownMenuGroup>
          <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {Arr.map(
            Arr.filter(
              table.getAllColumns(),
              (column) =>
                column.accessorFn !== undefined && column.getCanHide(),
            ),
            (column) => (
              <DropdownMenuCheckboxItem
                key={column.id}
                className='capitalize'
                checked={column.getIsVisible()}
                onCheckedChange={(value) => {
                  column.toggleVisibility(value);
                }}
              >
                {column.id}
              </DropdownMenuCheckboxItem>
            ),
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
