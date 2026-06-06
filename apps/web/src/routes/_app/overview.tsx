import { createFileRoute } from '@tanstack/react-router';

import { OverviewSection } from '@/components/sections/overview-section';

export const Route = createFileRoute('/_app/overview')({
  component: OverviewPage,
});

function OverviewPage() {
  return <OverviewSection />;
}
