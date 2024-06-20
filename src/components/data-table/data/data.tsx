import { InventoryItemType } from '@/lib/vm/inventory';
import {
  ArrowDownIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  CheckCircledIcon,
  CircleIcon,
  CrossCircledIcon,
  QuestionMarkCircledIcon,
  StopwatchIcon,
} from '@radix-ui/react-icons';
import {
  BoxIcon,
  DumbbellIcon,
  ShirtIcon,
  ShoppingBagIcon,
  SwordIcon,
} from 'lucide-react';

export const item_types: {
  value: InventoryItemType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    value: 'ACCESSORY',
    label: 'Accessory',
    icon: ShoppingBagIcon,
  },
  {
    value: 'AOW',
    label: 'Ashes of War',
    icon: DumbbellIcon,
  },
  {
    value: 'ARMOR',
    label: 'Armor',
    icon: ShirtIcon,
  },
  {
    value: 'WEAPON',
    label: 'Weapon',
    icon: SwordIcon,
  },
  { value: 'ITEM', label: 'Item', icon: BoxIcon },
  { value: 'EMPTY', label: 'None', icon: QuestionMarkCircledIcon },
];

export const labels = [
  {
    value: 'bug',
    label: 'Bug',
  },
  {
    value: 'feature',
    label: 'Feature',
  },
  {
    value: 'documentation',
    label: 'Documentation',
  },
];

export const statuses = [
  {
    value: 'backlog',
    label: 'Backlog',
    icon: QuestionMarkCircledIcon,
  },
  {
    value: 'todo',
    label: 'Todo',
    icon: CircleIcon,
  },
  {
    value: 'in progress',
    label: 'In Progress',
    icon: StopwatchIcon,
  },
  {
    value: 'done',
    label: 'Done',
    icon: CheckCircledIcon,
  },
  {
    value: 'canceled',
    label: 'Canceled',
    icon: CrossCircledIcon,
  },
];

export const priorities = [
  {
    label: 'Low',
    value: 'low',
    icon: ArrowDownIcon,
  },
  {
    label: 'Medium',
    value: 'medium',
    icon: ArrowRightIcon,
  },
  {
    label: 'High',
    value: 'high',
    icon: ArrowUpIcon,
  },
];
