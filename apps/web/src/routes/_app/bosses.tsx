import { createFileRoute } from '@tanstack/react-router';

import { BossesDataTable } from '@/components/sections/bosses-data-table';
import { StoryBossSection } from '@/components/sections/story-boss-section';

export const Route = createFileRoute('/_app/bosses')({
  component: BossesPage,
});

function BossesPage() {
  return (
    <>
      <StoryBossSection />
      <BossesDataTable />
    </>
  );
}
