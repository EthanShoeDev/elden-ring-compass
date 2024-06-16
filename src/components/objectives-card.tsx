import { Badge } from '@/components/ui/badge';
import {
  ELDEN_RING_OBJECTIVES,
  EldenRingObjectiveItem,
} from '@/lib/er-objectives';
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
import { useEldenRingSaveQuery } from '@/lib/er-save-file-query';
import { useSlotSelection } from '@/stores/slot-selection-store';
import { ELDEN_RING_DATA } from '@/lib/er-static-data';

export function ObjectivesCard() {
  return (
    <div className="flex flex-col gap-4 rounded-lg bg-muted p-2 shadow-md md:p-6">
      {ELDEN_RING_OBJECTIVES.map((region, idx) => (
        <div
          key={idx}
          className="prose prose-lg flex max-w-none flex-col dark:prose-invert prose-h3:my-0"
        >
          <h2 className="my-0">{region.name}</h2>

          <Accordion type="multiple">
            <AccordionItem value="overview">
              <AccordionTrigger className="py-0">Overview</AccordionTrigger>
              <AccordionContent className="pb-2">
                <ol className="text-lg">
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
              <AccordionContent className="flex flex-col gap-2 pb-2">
                <Accordion
                  type="multiple"
                  defaultValue={region.detailed.map(
                    (_, idx) => `step_${idx.toString()}`
                  )}
                >
                  {region.detailed.map((detailStep, idx) => (
                    <Card key={idx} className="border-4 p-4">
                      <AccordionItem value={`step_${idx.toString()}`}>
                        <AccordionTrigger className="py-0">
                          <h4 className="my-0 text-lg font-bold">
                            Step {idx + 1}:
                          </h4>
                        </AccordionTrigger>
                        <AccordionContent className="pb-2">
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
                                  'boss' in objective &&
                                    'bg-red-100 dark:bg-red-900',
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
                                        <ItemListItem key={idx} item={item} />
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
                        </AccordionContent>
                      </AccordionItem>
                    </Card>
                  ))}
                </Accordion>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      ))}
    </div>
  );
}

function itemFromName(name: string) {
  const items = Object.entries(ELDEN_RING_DATA).map(
    ([regionOuterName, regionOuterData]) =>
      Object.entries(regionOuterData).map(
        ([regionInnerName, regionInnerItemMap]) =>
          Object.entries(regionInnerItemMap).map(([itemId, itemData]) => ({
            itemId,
            ...itemData,
            regionOuterName,
            regionInnerName,
          }))
      )
  );
  return items.flat(2).find((item) => item.name === name);
}

function ItemListItem({ item }: { item: EldenRingObjectiveItem }) {
  const query = useEldenRingSaveQuery();
  const [slot] = useSlotSelection();

  const itemData = itemFromName(item.name);

  const completed =
    query.data && slot && itemData?.name
      ? query.data.slots[slot].idList.includes(itemData.itemId)
      : undefined;

  console.log(itemData);
  return (
    <li className="my-1">
      <a
        target="_blank"
        rel="noreferrer"
        href={
          item.href ??
          `https://eldenring.wiki.fextralife.com/${item.name.split(' ').join('+')}`
        }
      >
        {completed === undefined ? <></> : completed ? '✅ ' : '❌ '}
        {item.name}
      </a>
    </li>
  );
}
