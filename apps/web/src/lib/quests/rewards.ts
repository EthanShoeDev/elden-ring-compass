import { itemIconUrl } from '@elden-ring-compass/data/images';
import { Array as Arr, Record as Rec } from 'effect';

import { CATALOG } from '../inventory-catalog-data';
import { wikiNameForItem, wikiPageUrl } from '../wiki';
import { type Detour, flatten, type Quest, type Step } from './model';

/** A reward item resolved against the inventory catalog. */
export interface RewardItem {
  readonly name: string;
  readonly iconUrl: string | undefined;
  readonly wikiUrl: string | undefined;
}

/** Every catalog item by exact name (first table wins, matching the inventory tabs' order). */
const ITEMS_BY_NAME: ReadonlyMap<string, RewardItem> = new Map(
  Arr.reverse(
    Arr.flatMap(Rec.values(CATALOG), (rows) =>
      Arr.map(rows, (row): readonly [string, RewardItem] => {
        const wikiName = wikiNameForItem(row);
        return [
          row.name,
          {
            name: row.name,
            iconUrl: itemIconUrl(row.icon),
            wikiUrl: wikiName === null ? undefined : wikiPageUrl(wikiName),
          },
        ];
      }),
    ),
  ),
);

/** The catalog item for a reward name, if it is one. */
export const rewardItem = (name: string): RewardItem | undefined =>
  ITEMS_BY_NAME.get(name);

/** One reward of a questline, with the step that gives it. */
export interface QuestReward {
  readonly kind: 'item' | 'unlock';
  readonly name: string;
  /** Resolved for `item` rewards. */
  readonly item: RewardItem | undefined;
  readonly step: Step;
  /** Set when the step is part of an optional detour (the reward can be missed). */
  readonly detour: Detour | undefined;
}

/** Every reward a questline gives, in step order: the "what do I get?" summary. */
export const questRewards = (quest: Quest): ReadonlyArray<QuestReward> => {
  const flat = flatten(quest.steps);
  return Arr.flatMap(flat.steps, (step) => {
    const detour = flat.detourOf.get(step.id);
    return [
      ...Arr.map(step.rewards ?? [], (name) => ({
        kind: 'item' as const,
        name,
        item: rewardItem(name),
        step,
        detour,
      })),
      ...Arr.map(step.unlocks ?? [], (name) => ({
        kind: 'unlock' as const,
        name,
        item: undefined,
        step,
        detour,
      })),
    ];
  });
};
