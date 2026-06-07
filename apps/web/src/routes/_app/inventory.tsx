import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/inventory')({
  component: InventoryLayout,
});

/**
 * Inventory is now a section with its own nested routes (Items / Events /
 * Regions / Weapons) surfaced as a collapsible group in the sidebar. This
 * parent just renders the active child via <Outlet />; `/inventory` itself
 * redirects to `/inventory/items` (see ./inventory/index.tsx).
 */
function InventoryLayout() {
  return <Outlet />;
}
