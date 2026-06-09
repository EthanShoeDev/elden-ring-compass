import { Effect } from 'effect';

import { PipelineContext } from '../domain/context.ts';
import { findOodleDll } from '../external/oodle.ts';
import { loadItemText } from '../game/item-text.ts';

/**
 * Stage 3 — text (FMG). Extract weapon/protector/goods/accessory/arts/gem names
 * (base + DLC merged) as id → string maps. Reads the unpacked `msg/engus/*.msgbnd`
 * (DCX → BND4 → FMG). Captions/descriptions come later.
 */
export const text = Effect.gen(function* () {
  const ctx = yield* PipelineContext;
  const oo2core = yield* findOodleDll(ctx.gameRoot);
  const names = yield* loadItemText(ctx.gameRoot, oo2core);

  yield* Effect.logInfo(
    `names — weapons:${names.WeaponName.size} armor:${names.ProtectorName.size} ` +
      `goods:${names.GoodsName.size} talismans:${names.AccessoryName.size} ` +
      `ashes-of-war:${names.GemName.size} arts:${names.ArtsName.size}`,
  );
  // Descriptions/summaries (Caption/Info FMGs). Empty here ⇒ a wrong table name.
  yield* Effect.logInfo(
    `captions — weapon:${names.WeaponCaption.size} armor:${names.ProtectorCaption.size} ` +
      `talisman:${names.AccessoryCaption.size} goods:${names.GoodsCaption.size} ` +
      `gem:${names.GemCaption.size} | summaries — armor:${names.ProtectorInfo.size} ` +
      `goods:${names.GoodsInfo.size} goods2:${names.GoodsInfo2.size}`,
  );
  // Phase 1(b) proof: a real DLC weapon name (Milady, a Shadow of the Erdtree
  // light greatsword) resolves out of the merged FMGs.
  const milady = names.WeaponName.get(67500000);
  yield* Effect.logInfo(
    `DLC sample — weapon 67500000 = ${milady ?? '(missing)'}`,
  );
  return names;
});
