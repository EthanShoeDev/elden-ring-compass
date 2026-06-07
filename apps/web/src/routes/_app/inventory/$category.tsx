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
  component: InventoryCategoryPage,
});

function InventoryCategoryPage() {
  const { category } = Route.useParams();
  // Guaranteed valid by beforeLoad.
  const tableType = SLUG_TO_TYPE[category]!;
  return <InventoryDataTableCard table={tableType} />;
}
