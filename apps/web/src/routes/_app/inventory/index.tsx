import { createFileRoute, redirect } from '@tanstack/react-router';

import { DEFAULT_INVENTORY_SLUG } from '@/lib/inventory-tables';

// Bare `/inventory` has no table of its own — land on the first category.
export const Route = createFileRoute('/_app/inventory/')({
  beforeLoad: () => {
    throw redirect({ to: '/inventory/$category', params: { category: DEFAULT_INVENTORY_SLUG } });
  },
});
