import { Badge } from '@/components/ui/badge';
import { ELDEN_RING_OBJECTIVES } from '@/lib/er-objectives';
import { cn } from '@/lib/utils';
import { CrownIcon, MapPinIcon, UserRoundIcon } from 'lucide-react';
import Markdown from 'react-markdown';

export function ObjectivesCard() {
  return (
    <div className="flex flex-col gap-4 rounded-lg bg-white p-6 shadow-md dark:bg-gray-800">
      {ELDEN_RING_OBJECTIVES.map((region, idx) => (
        <div
          key={idx}
          className="prose flex max-w-none flex-col prose-ol:m-0 prose-li:m-0"
        >
          <h2>{region.name}</h2>
          <h3>Overview:</h3>
          <ol>
            {region.overview.map((overviewStep, idx) => (
              <li key={idx}>{overviewStep}</li>
            ))}
          </ol>
          <h3>Detailed Steps:</h3>
          {region.detailed.map((detailStep, idx) => (
            <div key={idx}>
              <h4>Step {idx + 1}:</h4>
              <Markdown>{detailStep.description}</Markdown>
              <p>
                <strong>Objectives:</strong>
              </p>
              <div className="flex flex-col gap-4">
                {detailStep.objectives.map((objective, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      'rounded-md bg-gray-100 p-4 dark:bg-gray-900',
                      'boss' in objective && 'bg-red-100 dark:bg-red-900',
                      'npc' in objective && 'bg-yellow-100 dark:bg-yellow-900',
                      'location' in objective && 'bg-blue-100 dark:bg-blue-900'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {'boss' in objective && <CrownIcon />}
                      {'npc' in objective && <UserRoundIcon />}
                      {'location' in objective && <MapPinIcon />}

                      <h5 className="text-lg font-bold">{objective.label}</h5>
                    </div>
                    {objective.notes && (
                      <p className="my-2">{objective.notes}</p>
                    )}
                    {objective.items && (
                      <div>
                        <strong>Items:</strong>
                        <ul className="m-0">
                          {objective.items.map((item, idx) => (
                            <li key={idx}>{item.name}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="mt-4 flex items-center gap-2">
                      {objective.tags?.map((tag, idx) => (
                        <Badge key={idx}>{tag}</Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
