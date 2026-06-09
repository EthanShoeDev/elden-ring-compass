import { createFileRoute } from '@tanstack/react-router';

import { QuestsView } from '@/components/shell/quests-view';

export const Route = createFileRoute('/_app/quests')({
  component: QuestsPage,
});

function QuestsPage() {
  return <QuestsView />;
}
