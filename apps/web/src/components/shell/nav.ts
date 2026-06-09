import { type LinkProps } from '@tanstack/react-router';
import {
  FlameIcon,
  LayoutDashboardIcon,
  ListChecksIcon,
  MapIcon,
  PackageIcon,
  SkullIcon,
  SlidersHorizontalIcon,
  type LucideIcon,
} from 'lucide-react';

import { INVENTORY_TABLES } from '@/lib/inventory-tables';

/**
 * The dashboard's primary navigation. Each entry is its own TanStack Router
 * route under the `_app` layout. Map leads — the app is fully explorable
 * without a save, and the world map is the hero landing view at `/` (see the
 * compass-app design kit: README "UI kits"). Build & Quests are scaffolded
 * previews of future features (docs/projects/future/*).
 */
/** A nested nav entry — rendered as a `SidebarMenuSub` link under its parent. */
type NavChild = {
  to: LinkProps['to'];
  /** Route params, for dynamic child routes (e.g. `/inventory/$category`). */
  params?: Record<string, string>;
  label: string;
  /** Resolved pathname, used for active-state matching. */
  matchPath: string;
};

export type NavItem = {
  /** Route path under the `_app` layout. Typed against the generated route tree. */
  to: LinkProps['to'];
  label: string;
  icon: LucideIcon;
  /** Match this route exactly (only the index/map route needs it). */
  exact?: boolean;
  /** Scaffolded preview of an unimplemented feature. */
  preview?: boolean;
  /** When present, this item renders as a collapsible group of sub-routes. */
  children?: readonly NavChild[];
};

export const NAV: readonly NavItem[] = [
  { to: '/', label: 'Map', icon: MapIcon, exact: true },
  { to: '/bosses', label: 'Bosses', icon: SkullIcon },
  {
    to: '/inventory',
    label: 'Inventory',
    icon: PackageIcon,
    // One sub-route per in-game inventory tab (see @/lib/inventory-tables).
    children: INVENTORY_TABLES.map((t) => ({
      to: '/inventory/$category',
      params: { category: t.slug },
      matchPath: `/inventory/${t.slug}`,
      label: t.label,
    })),
  },
  { to: '/graces', label: 'Sites of Grace', icon: FlameIcon },
  { to: '/build', label: 'Calculator', icon: SlidersHorizontalIcon },
  { to: '/quests', label: 'Quests', icon: ListChecksIcon, preview: true },
  { to: '/overview', label: 'Overview', icon: LayoutDashboardIcon },
];

export const SECTION_META: Record<string, { title: string; sub: string }> = {
  '/': {
    title: 'Interactive Map',
    sub: 'Explore the Lands Between — graces, bosses, and everywhere you’ve been.',
  },
  '/bosses': {
    title: 'Bosses',
    sub: 'Demigods, shardbearers, and the path to the Erdtree.',
  },
  '/inventory': {
    title: 'Inventory',
    sub: 'Every item class in the game, filterable.',
  },
  '/graces': {
    title: 'Sites of Grace',
    sub: 'Every grace in the Lands Between — and which you’ve discovered.',
  },
  '/build': {
    title: 'Weapon Calculator',
    sub: 'Attack Rating for every weapon at your stats — find your best.',
  },
  '/quests': {
    title: 'Quest Compass',
    sub: 'Save-aware guidance on what to do next.',
  },
  '/overview': {
    title: 'Overview',
    sub: 'Your run at a glance.',
  },
  '/credits': {
    title: 'Acknowledgments',
    sub: 'The open-source projects Compass is built on top of.',
  },
};

export const REPO_URL = 'https://github.com/EthanShoeDev/elden-ring-compass';
