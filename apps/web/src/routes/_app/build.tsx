import { createFileRoute } from '@tanstack/react-router';

import { BuildView } from '@/components/shell/build-view';

export const Route = createFileRoute('/_app/build')({
  component: BuildPage,
});

function BuildPage() {
  return <BuildView />;
}
