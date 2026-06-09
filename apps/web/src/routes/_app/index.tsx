import { createFileRoute } from '@tanstack/react-router';

import { MapSection } from '@/components/sections/map-section';

export const Route = createFileRoute('/_app/')({
  component: MapPage,
});

function MapPage() {
  return <MapSection embedded />;
}
