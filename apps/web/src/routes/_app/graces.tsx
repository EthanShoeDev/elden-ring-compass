import { createFileRoute } from '@tanstack/react-router';

import { GracesDataTable } from '@/components/sections/graces-data-table';

export const Route = createFileRoute('/_app/graces')({
  // Single fill-mode table — let it own the viewport height (internal scroll),
  // no trailing footer. See `_app.tsx`.
  staticData: { fill: true },
  component: GracesPage,
});

function GracesPage() {
  return <GracesDataTable />;
}
