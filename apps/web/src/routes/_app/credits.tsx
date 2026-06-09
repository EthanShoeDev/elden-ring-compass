import { createFileRoute } from '@tanstack/react-router';

import { CreditsSection } from '@/components/sections/credits-section';

export const Route = createFileRoute('/_app/credits')({
  component: CreditsPage,
});

function CreditsPage() {
  return <CreditsSection />;
}
