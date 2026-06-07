import { createFileRoute } from '@tanstack/react-router';

import { GracesDataTable } from '@/components/sections/graces-data-table';

export const Route = createFileRoute('/_app/graces')({
  component: GracesPage,
});

function GracesPage() {
  return <GracesDataTable />;
}
