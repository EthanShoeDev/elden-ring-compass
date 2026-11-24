import { Array as Arr, Record as Rec } from 'effect';

import { wikiPageUrl } from '../wiki';

/**
 * The Fextralife NPC page(s) that walk through each questline. Some questlines follow two NPCs
 * (Roderika & Hewg), so a questline can link more than one page. Every name here is HEAD-checked
 * by `scripts/wiki-link-check.ts` (the `quests` source), so a renamed page fails lint instead of
 * shipping a 404.
 */
const QUEST_WIKI_PAGES: Readonly<Record<string, ReadonlyArray<string>>> = {
  corhyn: ['Brother Corhyn', 'Goldmask'],
  varre: ['White Mask Varre'],
  boc: ['Boc the Seamster'],
  yura: ['Bloody Finger Hunter Yura'],
  hyetta: ['Hyetta'],
  irina: ['Irina'],
  edgar: ['Edgar'],
  gowry: ['Gowry'],
  millicent: ['Millicent'],
  gurranq: ['Gurranq, Beast Clergyman'],
  'd-beholder': ['D, Beholder of Death'],
  'd-hunter': ['D, Hunter of the Dead'],
  fia: ['Fia'],
  rogier: ['Sorcerer Rogier'],
  melina: ['Melina'],
  ranni: ['Ranni the Witch'],
  blaidd: ['Blaidd'],
  iji: ['War Counselor Iji'],
  seluvis: ['Preceptor Seluvis'],
  jerren: ['Witch-Hunter Jerren'],
  sellen: ['Sorceress Sellen'],
  gideon: ['Gideon Ofnir'],
  nepheli: ['Nepheli Loux'],
  kenneth: ['Kenneth Haight'],
  gostoc: ['Gatekeeper Gostoc'],
  'dung-eater': ['Dung Eater'],
  boggart: ['Blackguard Big Boggart'],
  rya: ['Rya'],
  tanith: ['Tanith'],
  bernahl: ['Knight Bernahl'],
  diallos: ['Diallos'],
  'jar-bairn': ['Jar Bairn'],
  alexander: ['Iron Fist Alexander'],
  patches: ['Patches'],
  latenna: ['Latenna'],
  roderika: ['Roderika', 'Smithing Master Hewg'],
  thops: ['Thops'],
  ymir: ['Count Ymir'],
  jolan: ['Swordhand of Night Jolan'],
  queelign: ['Fire Knight Queelign'],
  igon: ['Igon'],
  thiollier: ['Thiollier'],
  moore: ['Moore'],
  leda: ['Needle Knight Leda'],
  dane: ['Dryleaf Dane'],
  ansbach: ['Sir Ansbach'],
  freyja: ['Redmane Freyja'],
  hornsent: ['Hornsent'],
  grandam: ['Hornsent Grandam'],
};

export interface WikiLink {
  readonly label: string;
  readonly url: string;
}

/** The wiki pages for a questline (empty when none is mapped). */
export const questWikiLinks = (questId: string): ReadonlyArray<WikiLink> =>
  Arr.map(QUEST_WIKI_PAGES[questId] ?? [], (name) => ({
    label: name,
    url: wikiPageUrl(name),
  }));

/** Every page name, for the link checker. */
export const QUEST_WIKI_PAGE_NAMES: ReadonlyArray<string> = Arr.dedupe(
  Arr.flatten(Rec.values(QUEST_WIKI_PAGES)),
);
