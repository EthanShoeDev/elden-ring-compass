import { createFileRoute } from '@tanstack/react-router';
import { Schema } from 'effect';

import { QuestsView } from '@/components/shell/quests-view';

const SearchSchema = Schema.Struct({
  /** The selected questline's id (`Quest.id`). */
  quest: Schema.optional(Schema.String),
});

export const Route = createFileRoute('/_app/quests')({
  validateSearch: Schema.toStandardSchemaV1(SearchSchema),
  component: QuestsPage,
});

function QuestsPage() {
  const { quest } = Route.useSearch();
  return <QuestsView quest={quest} />;
}
