import { createFileRoute, redirect } from '@tanstack/react-router';

import { InventoryDataTableCard } from '@/components/sections/inventory-data-table-card';
import { DEFAULT_INVENTORY_SLUG, SLUG_TO_TYPE } from '@/lib/inventory-tables';

export const Route = createFileRoute('/_app/inventory/$category')({
  // Unknown category slug → bounce to the default category.
  beforeLoad: ({ params }) => {
    if (!SLUG_TO_TYPE[params.category]) {
      throw redirect({ to: '/inventory/$category', params: { category: DEFAULT_INVENTORY_SLUG } });
    }
  },
  // The category table is the whole route — render it edge-to-edge (no shell
  // page padding); the table provides its own slim header bar + gutter.
  staticData: { fullBleed: true },
  component: InventoryCategoryPage,
});

function InventoryCategoryPage() {
  const { category } = Route.useParams();
  // Guaranteed valid by beforeLoad (unknown slugs redirect), so this guard is
  // unreachable — it just narrows away the `| undefined` without a `!`.
  const tableType = SLUG_TO_TYPE[category];
  if (!tableType) return null;
  return <InventoryDataTableCard table={tableType} />;
}
