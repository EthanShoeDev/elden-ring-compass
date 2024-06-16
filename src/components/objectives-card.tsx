import { Badge } from '@/components/ui/badge';
import { ELDEN_RING_OBJECTIVES } from '@/lib/er-objectives';
import { cn } from '@/lib/utils';
import { CrownIcon, MapPinIcon, UserRoundIcon } from 'lucide-react';
import Markdown from 'react-markdown';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card } from './ui/card';

export function ObjectivesCard() {
  return (
    <div className="flex flex-col gap-4 rounded-lg bg-muted p-2 shadow-md md:p-6">
      {ELDEN_RING_OBJECTIVES.map((region, idx) => (
        <div
          key={idx}
          className="prose prose-lg flex max-w-none flex-col dark:prose-invert prose-h3:my-3"
        >
          <h2 className="my-0">{region.name}</h2>

          <Accordion type="multiple">
            <AccordionItem value="overview">
              <AccordionTrigger className="py-0">Overview</AccordionTrigger>
              <AccordionContent className="pb-2">
                <ol>
                  {region.overview.map((overviewStep, idx) => (
                    <li className="my-0" key={idx}>
                      {overviewStep}
                    </li>
                  ))}
                </ol>{' '}
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="detailed-steps">
              <AccordionTrigger className="py-0">
                Detailed Steps
              </AccordionTrigger>
              <AccordionContent className="flex flex-col gap-4 pb-2">
                {region.detailed.map((detailStep, idx) => (
                  <Card key={idx} className="border-4 p-4">
                    <h4 className="mt-2 text-lg font-bold">Step {idx + 1}:</h4>
                    <Markdown className="text-lg">
                      {detailStep.description}
                    </Markdown>
                    <p className="text-lg font-bold">Objectives:</p>
                    <div className="flex flex-col gap-4">
                      {detailStep.objectives.map((objective, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            'rounded-md bg-gray-100 p-4 dark:bg-gray-900',
                            'boss' in objective && 'bg-red-100 dark:bg-red-900',
                            'npc' in objective &&
                              'bg-yellow-100 dark:bg-yellow-900',
                            'location' in objective &&
                              'bg-blue-100 dark:bg-blue-900'
                          )}
                        >
                          <div className="flex items-center gap-2">
                            {'boss' in objective && <CrownIcon />}
                            {'npc' in objective && <UserRoundIcon />}
                            {'location' in objective && <MapPinIcon />}

                            <h5 className="text-lg font-bold">
                              {objective.label}
                            </h5>
                          </div>
                          {objective.notes && (
                            <p className="my-2">{objective.notes}</p>
                          )}
                          {objective.items && (
                            <div>
                              <strong>Items:</strong>
                              <ul className="my-0">
                                {objective.items.map((item, idx) => (
                                  <li className="my-0" key={idx}>
                                    {item.name}
                                  </li>
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
                  </Card>
                ))}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      ))}
    </div>
  );
}
