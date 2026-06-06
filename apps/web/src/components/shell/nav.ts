import { type LinkProps } from '@tanstack/react-router';
import {
  CrownIcon,
  LayoutDashboardIcon,
  ListChecksIcon,
  MapIcon,
  PackageIcon,
  SlidersHorizontalIcon,
  type LucideIcon,
} from 'lucide-react';

/**
 * The dashboard's primary navigation. Each entry is its own TanStack Router
 * route under the `_app` layout. Map leads — the app is fully explorable
 * without a save, and the world map is the hero landing view at `/` (see the
 * compass-app design kit: README "UI kits"). Build & Quests are scaffolded
 * previews of future features (docs/projects/future/*).
 */
export type NavItem = {
  /** Route path under the `_app` layout. Typed against the generated route tree. */
  to: LinkProps['to'];
  label: string;
  icon: LucideIcon;
  /** Match this route exactly (only the index/map route needs it). */
  exact?: boolean;
  /** Scaffolded preview of an unimplemented feature. */
  preview?: boolean;
};

export const NAV: readonly NavItem[] = [
  { to: '/', label: 'Map', icon: MapIcon, exact: true },
  { to: '/bosses', label: 'Bosses', icon: CrownIcon },
  { to: '/inventory', label: 'Inventory', icon: PackageIcon },
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
};

export const REPO_URL = 'https://github.com/EthanShoeDev/elden-ring-compass';
