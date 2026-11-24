import { Array as Arr } from 'effect';

import type { Slot } from '../save-dto';
import { flagFacts, slotFacts } from './facts';
import { alexander } from './lines/alexander';
import { ansbach } from './lines/ansbach';
import { bernahl } from './lines/bernahl';
import { blaidd } from './lines/blaidd';
import { boc } from './lines/boc';
import { boggart } from './lines/boggart';
import { corhyn } from './lines/corhyn';
import { dBeholder } from './lines/d-beholder';
import { dHunter } from './lines/d-hunter';
import { dane } from './lines/dane';
import { diallos } from './lines/diallos';
import { dungEater } from './lines/dung-eater';
import { edgar } from './lines/edgar';
import { fia } from './lines/fia';
import { freyja } from './lines/freyja';
import { gideon } from './lines/gideon';
import { gostoc } from './lines/gostoc';
import { gowry } from './lines/gowry';
import { grandam } from './lines/grandam';
import { gurranq } from './lines/gurranq';
import { hornsent } from './lines/hornsent';
import { hyetta } from './lines/hyetta';
import { igon } from './lines/igon';
import { iji } from './lines/iji';
import { irina } from './lines/irina';
import { jarBairn } from './lines/jar-bairn';
import { jerren } from './lines/jerren';
import { jolan } from './lines/jolan';
import { kenneth } from './lines/kenneth';
import { latenna } from './lines/latenna';
import { leda } from './lines/leda';
import { melina } from './lines/melina';
import { millicent } from './lines/millicent';
import { moore } from './lines/moore';
import { nepheli } from './lines/nepheli';
import { patches } from './lines/patches';
import { queelign } from './lines/queelign';
import { ranni } from './lines/ranni';
import { roderika } from './lines/roderika';
import { rogier } from './lines/rogier';
import { rya } from './lines/rya';
import { sellen } from './lines/sellen';
import { seluvis } from './lines/seluvis';
import { tanith } from './lines/tanith';
import { thiollier } from './lines/thiollier';
import { thops } from './lines/thops';
import { varre } from './lines/varre';
import { ymir } from './lines/ymir';
import { yura } from './lines/yura';
import { flatten, type Quest } from './model';
import { deriveQuests, type QuestProgress } from './progress';

/**
 * Every questline, in display order: the base-game flowchart's columns left to right, then the
 * Shadow of the Erdtree ones. Drafts (not written yet) are included so cross-questline references
 * always resolve; the UI hides them.
 */
export const QUESTS: ReadonlyArray<Quest> = [
  corhyn,
  varre,
  boc,
  yura,
  hyetta,
  irina,
  edgar,
  gowry,
  millicent,
  gurranq,
  dBeholder,
  dHunter,
  fia,
  rogier,
  melina,
  ranni,
  blaidd,
  iji,
  seluvis,
  jerren,
  sellen,
  gideon,
  nepheli,
  kenneth,
  gostoc,
  dungEater,
  boggart,
  rya,
  tanith,
  bernahl,
  diallos,
  jarBairn,
  alexander,
  patches,
  latenna,
  roderika,
  thops,
  ymir,
  jolan,
  queelign,
  igon,
  thiollier,
  moore,
  leda,
  dane,
  ansbach,
  freyja,
  hornsent,
  grandam,
];

/** Progress of every questline for `slot`; with no save, the blank "guide" state. */
export function questProgress(
  slot: Readonly<Slot> | undefined,
): ReadonlyMap<string, QuestProgress> {
  return deriveQuests(QUESTS, slot ? slotFacts(slot) : flagFacts());
}

/** A step whose save evidence is missing or unconfirmed: work for the save-flag diff tool. */
export interface KnownGap {
  readonly quest: string;
  readonly step: string;
  readonly label: string;
  /** `flag-todo`: no flag known (see `Step.flagTodo`). `assumed`: a flag we haven't verified. */
  readonly kind: 'flag-todo' | 'assumed';
  readonly detail: string;
}

export const knownGaps = (
  quests: ReadonlyArray<Quest> = QUESTS,
): ReadonlyArray<KnownGap> =>
  Arr.flatMap(quests, (q) =>
    q.draft === true
      ? []
      : Arr.flatMap(flatten(q.steps).steps, (s): ReadonlyArray<KnownGap> => [
          ...(s.flagTodo === undefined
            ? []
            : [
                {
                  quest: q.id,
                  step: s.id,
                  label: s.label,
                  kind: 'flag-todo' as const,
                  detail: s.flagTodo,
                },
              ]),
          ...(s.evidence === 'assumed'
            ? [
                {
                  quest: q.id,
                  step: s.id,
                  label: s.label,
                  kind: 'assumed' as const,
                  detail: s.note ?? '',
                },
              ]
            : []),
        ]),
  );
