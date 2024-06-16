import { Card } from './ui/card';
import { InteractiveMap } from './interactive-map';
import { ObjectivesCard } from './objectives-card';

export function MainContent() {
  return (
    <main className="flex flex-1 flex-col items-center bg-gray-100 p-4 dark:bg-gray-900">
      <div className="flex max-w-[850px] flex-col gap-4">
        <Card className="max-h-[450px] overflow-hidden">
          <InteractiveMap />
        </Card>

        <ObjectivesCard />
      </div>
    </main>
  );
}
