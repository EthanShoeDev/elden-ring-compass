// import { DotsHorizontalIcon } from '@radix-ui/react-icons';
// import { Row } from '@tanstack/react-table';

// import { Button } from '@/components/ui/button';
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuRadioGroup,
//   DropdownMenuRadioItem,
//   DropdownMenuSeparator,
//   DropdownMenuShortcut,
//   DropdownMenuSub,
//   DropdownMenuSubContent,
//   DropdownMenuSubTrigger,
//   DropdownMenuTrigger,
// } from '@/components/ui/dropdown-menu';

// type DataTableRowActionsProps<TData> = {
//   row: Row<TData>;
// };

// export function DataTableRowActions<TData>({
//   row,
// }: DataTableRowActionsProps<TData>) {
//   'use no memo';
//   const task = inventoryItemSchema.parse(row.original);

//   return (
//     <DropdownMenu>
//       <DropdownMenuTrigger asChild>
//         <Button
//           variant="ghost"
//           className="flex size-8 p-0 data-[state=open]:bg-muted"
//         >
//           <DotsHorizontalIcon className="size-4" />
//           <span className="sr-only">Open menu</span>
//         </Button>
//       </DropdownMenuTrigger>
//       <DropdownMenuContent align="end" className="w-[160px]">
//         <DropdownMenuItem>Edit</DropdownMenuItem>
//         <DropdownMenuItem>Make a copy</DropdownMenuItem>
//         <DropdownMenuItem>Favorite</DropdownMenuItem>
//         <DropdownMenuSeparator />
//         <DropdownMenuSub>
//           <DropdownMenuSubTrigger>Labels</DropdownMenuSubTrigger>
//           <DropdownMenuSubContent>
//             <DropdownMenuRadioGroup value={task.name}>
//               {labels.map((label) => (
//                 <DropdownMenuRadioItem key={label.value} value={label.value}>
//                   {label.label}
//                 </DropdownMenuRadioItem>
//               ))}
//             </DropdownMenuRadioGroup>
//           </DropdownMenuSubContent>
//         </DropdownMenuSub>
//         <DropdownMenuSeparator />
//         <DropdownMenuItem>
//           Delete
//           <DropdownMenuShortcut>⌘⌫</DropdownMenuShortcut>
//         </DropdownMenuItem>
//       </DropdownMenuContent>
//     </DropdownMenu>
//   );
// }
