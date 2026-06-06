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
 * The dashboard's primary navigation. Map leads — the app is fully explorable
 * without a save, and the world map is the hero landing view (see the
 * compass-app design kit: README "UI kits"). Build & Quests are scaffolded
 * previews of future features (docs/projects/future/*).
 */
export type ViewId = 'map' | 'bosses' | 'inventory' | 'build' | 'quests' | 'overview';

export type NavItem = {
  id: ViewId;
  label: string;
  icon: LucideIcon;
  /** Scaffolded preview of an unimplemented feature. */
  preview?: boolean;
};

export const NAV: readonly NavItem[] = [
  { id: 'map', label: 'Map', icon: MapIcon },
  { id: 'bosses', label: 'Bosses', icon: CrownIcon },
  { id: 'inventory', label: 'Inventory', icon: PackageIcon },
  { id: 'build', label: 'Calculator', icon: SlidersHorizontalIcon },
  { id: 'quests', label: 'Quests', icon: ListChecksIcon, preview: true },
  { id: 'overview', label: 'Overview', icon: LayoutDashboardIcon },
];

export const SECTION_META: Record<ViewId, { title: string; sub: string }> = {
  map: {
    title: 'Interactive Map',
    sub: 'Explore the Lands Between — graces, bosses, and everywhere you’ve been.',
  },
  bosses: {
    title: 'Bosses',
    sub: 'Demigods, shardbearers, and the path to the Erdtree.',
  },
  inventory: {
    title: 'Inventory',
    sub: 'Every item class in the game, filterable.',
  },
  build: {
    title: 'Weapon Calculator',
    sub: 'Attack Rating for every weapon at your stats — find your best.',
  },
  quests: {
    title: 'Quest Compass',
    sub: 'Save-aware guidance on what to do next.',
  },
  overview: {
    title: 'Overview',
    sub: 'Your run at a glance.',
  },
};

export const REPO_URL = 'https://github.com/EthanShoeDev/elden-ring-compass';
