import { createFileRoute } from '@tanstack/react-router';

import { StoryBossSection } from '@/components/sections/story-boss-section';

export const Route = createFileRoute('/_app/bosses')({
  component: BossesPage,
});

function BossesPage() {
  return <StoryBossSection />;
}
