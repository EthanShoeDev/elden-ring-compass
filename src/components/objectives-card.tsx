// import { Badge } from '@/components/ui/badge';
// import {
//   ELDEN_RING_OBJECTIVES,
//   EldenRingObjectiveItem,
// } from '@/lib/er-objectives';
// import { cn } from '@/lib/utils';
// import { CrownIcon, InfoIcon, MapPinIcon, UserRoundIcon } from 'lucide-react';
// import Markdown from 'react-markdown';
// import {
//   Accordion,
//   AccordionContent,
//   AccordionItem,
//   AccordionTrigger,
// } from '@/components/ui/accordion';
// import { Card } from './ui/card';
// import { useEldenRingSaveQuery } from '@/lib/er-save-file-query';
// import { useSlotSelection } from '@/stores/slot-selection-store';
// import { ELDEN_RING_DATA } from '@/lib/er-static-data';
// import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
// import { Button } from './ui/button';
// import { useState } from 'react';

// export function ObjectivesCard() {
//   return (
//     <div className="flex max-w-[850px] flex-col gap-4 rounded-lg bg-muted p-2 shadow-md md:p-6">
//       {ELDEN_RING_OBJECTIVES.map((region, idx) => (
//         <div
//           key={idx}
//           className="prose prose-lg flex max-w-none flex-col dark:prose-invert prose-h3:my-0"
//         >
//           <h2 className="my-0 pb-2">{region.name}</h2>

//           <Accordion type="multiple" defaultValue={['detailed-steps']}>
//             <AccordionItem value="overview">
//               <AccordionTrigger className="py-0">Overview</AccordionTrigger>
//               <AccordionContent className="pb-2">
//                 <ol className="text-lg">
//                   {region.overview.map((overviewStep, idx) => (
//                     <li className="my-0" key={idx}>
//                       {overviewStep}
//                     </li>
//                   ))}
//                 </ol>{' '}
//               </AccordionContent>
//             </AccordionItem>
//             <AccordionItem value="detailed-steps">
//               <AccordionTrigger className="py-0 pb-2">
//                 Detailed Steps
//               </AccordionTrigger>
//               <AccordionContent className="flex flex-col gap-2 pb-2">
//                 <Accordion
//                   type="multiple"
//                   defaultValue={region.detailed
//                     .filter((detail) => detail.objectives.length > 0)
//                     .map((_, idx) => `step_${idx.toString()}`)}
//                 >
//                   {region.detailed.map((detailStep, idx) => (
//                     <Card key={idx} className="border-4 p-4">
//                       <AccordionItem value={`step_${idx.toString()}`}>
//                         <AccordionTrigger className="gap-2 py-0">
//                           <div className="not-prose flex w-full items-center justify-between">
//                             <h4 className="my-0 text-lg font-bold">
//                               Step {idx + 1}:
//                             </h4>
//                             <p>0/{detailStep.objectives.length.toString()}</p>
//                           </div>
//                         </AccordionTrigger>
//                         <AccordionContent className="pb-2">
//                           <Accordion
//                             type="multiple"
//                             defaultValue={['objectives']}
//                           >
//                             <AccordionItem value="description">
//                               <AccordionTrigger>Description</AccordionTrigger>
//                               <AccordionContent>
//                                 <Markdown className="text-lg">
//                                   {detailStep.description}
//                                 </Markdown>
//                               </AccordionContent>
//                             </AccordionItem>
//                             <AccordionItem value="objectives">
//                               <AccordionTrigger>Objectives</AccordionTrigger>
//                               <AccordionContent>
//                                 <div className="flex flex-col gap-4">
//                                   {detailStep.objectives.map(
//                                     (objective, idx) => (
//                                       <div
//                                         key={idx}
//                                         className={cn(
//                                           'rounded-md bg-gray-100 p-4 dark:bg-gray-900',
//                                           'boss' in objective &&
//                                             'bg-red-100 dark:bg-red-900',
//                                           'npc' in objective &&
//                                             'bg-yellow-100 dark:bg-yellow-900',
//                                           'location' in objective &&
//                                             'bg-blue-100 dark:bg-blue-900'
//                                         )}
//                                       >
//                                         <div className="flex items-center gap-2">
//                                           {'boss' in objective && <CrownIcon />}
//                                           {'npc' in objective && (
//                                             <UserRoundIcon />
//                                           )}
//                                           {'location' in objective && (
//                                             <MapPinIcon />
//                                           )}

//                                           <h5 className="text-lg font-bold">
//                                             {objective.label}
//                                           </h5>
//                                         </div>
//                                         {objective.notes && (
//                                           <p className="my-2">
//                                             {objective.notes}
//                                           </p>
//                                         )}
//                                         {objective.items && (
//                                           <div>
//                                             <strong>Items:</strong>
//                                             <ul className="my-0 list-none pl-0">
//                                               {objective.items.map(
//                                                 (item, idx) => (
//                                                   <ItemListItem
//                                                     key={idx}
//                                                     item={item}
//                                                   />
//                                                 )
//                                               )}
//                                             </ul>
//                                           </div>
//                                         )}
//                                         <div className="mt-4 flex items-center gap-2">
//                                           {objective.tags?.map((tag, idx) => (
//                                             <Badge key={idx}>{tag}</Badge>
//                                           ))}
//                                         </div>
//                                       </div>
//                                     )
//                                   )}
//                                 </div>
//                               </AccordionContent>
//                             </AccordionItem>
//                           </Accordion>
//                           {/* <p className="text-lg font-bold">Objectives:</p> */}
//                         </AccordionContent>
//                       </AccordionItem>
//                     </Card>
//                   ))}
//                 </Accordion>
//               </AccordionContent>
//             </AccordionItem>
//           </Accordion>
//         </div>
//       ))}
//     </div>
//   );
// }

// function itemFromName(name: string) {
//   const items = Object.entries(ELDEN_RING_DATA).map(
//     ([regionOuterName, regionOuterData]) =>
//       Object.entries(regionOuterData).map(
//         ([regionInnerName, regionInnerItemMap]) =>
//           Object.entries(regionInnerItemMap).map(([itemId, itemData]) => ({
//             itemId,
//             ...itemData,
//             regionOuterName,
//             regionInnerName,
//           }))
//       )
//   );
//   return items.flat(2).find((item) => item.name === name);
// }

// function ItemListItem({ item }: { item: EldenRingObjectiveItem }) {
//   const { query } = useEldenRingSaveQuery();
//   const [slot] = useSlotSelection();

//   const [tooltipOpen, setTooltipOpen] = useState(false);

//   const itemData = itemFromName(item.name);

//   const completed =
//     query.data && slot && itemData?.name
//       ? query.data.slots[slot].idList.includes(itemData.itemId)
//       : undefined;

//   return (
//     <li className="my-1">
//       <div className="flex items-center gap-2">
//         <Button
//           className="rounded-full"
//           size="icon"
//           variant="ghost"
//           onClick={() => {
//             setTooltipOpen(true);
//           }}
//         >
//           <InfoIcon className="size-4" />
//         </Button>
//         <Tooltip
//           open={tooltipOpen}
//           onOpenChange={(v) => {
//             setTooltipOpen(v);
//           }}
//         >
//           <TooltipTrigger asChild>
//             <a
//               target="_blank"
//               rel="noreferrer"
//               className="text-base"
//               href={
//                 item.href ??
//                 `https://eldenring.wiki.fextralife.com/${item.name.split(' ').join('+')}`
//               }
//             >
//               {completed === undefined ? <></> : completed ? '✅ ' : '❌ '}
//               {item.name}
//             </a>
//           </TooltipTrigger>
//           <TooltipContent className="max-w-lg rounded-lg p-4 shadow-lg">
//             <div className="space-y-2">
//               <p className="font-semibold">Hint:</p>
//               <div
//                 className="rounded-md border p-2"
//                 dangerouslySetInnerHTML={{ __html: itemData?.hint ?? '' }}
//               ></div>
//               <p>
//                 Broad Region:{' '}
//                 <span className="font-medium">{itemData?.regionOuterName}</span>
//               </p>
//               <p>
//                 Specific Region:{' '}
//                 <span className="font-medium">{itemData?.regionInnerName}</span>
//               </p>
//               <p>
//                 Type: <span className="font-medium">{itemData?.type}</span>
//               </p>
//               <p>
//                 Item Id: <span className="font-medium">{itemData?.itemId}</span>
//               </p>
//             </div>
//           </TooltipContent>
//         </Tooltip>
//         {item.notes && <span className="text-sm">{item.notes}</span>}
//       </div>
//     </li>
//   );
// }
