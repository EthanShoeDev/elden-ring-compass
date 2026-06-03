import { Effect } from 'effect';

import { findOodleDll } from '../src/external/oodle.ts';
import { decodeRow, parseParam, type RowValue } from '../src/formats/param.ts';
import { loadParamdef } from '../src/formats/paramdef.ts';
import { loadGraces } from '../src/game/graces.ts';
import { loadRegulationParams } from '../src/game/regulation.ts';

const GAME = 'C:/Program Files (x86)/Steam/steamapps/common/ELDEN RING/Game';
const num = (row: ReadonlyMap<string, RowValue>, k: string) => {
  const v = row.get(k);
  return typeof v === 'number' ? v : 0;
};

await Effect.runPromise(
  Effect.gen(function* () {
    const oo2 = yield* findOodleDll(GAME);
    const params = yield* loadRegulationParams(GAME, oo2);

    // Grace name + region label, keyed by grace flag id.
    const graces = yield* loadGraces(params, GAME, oo2);
    const graceByFlag = new Map(graces.map((g) => [g.flagId, g]));
    console.log(`graces: ${graces.length}`);

    const prBytes = params.get('PlayRegionParam')!;
    const pr = yield* parseParam(prBytes);
    const prDef = yield* loadParamdef('PlayRegionParam');
    const regions = pr.rows.map((r) => ({
      id: r.id,
      row: decodeRow(prBytes, r.dataOffset, prDef, pr.little),
    }));

    // Can a PlayRegion be NAMED via its mapMenuUnlockEventId → grace?
    const placed = regions.filter((x) => num(x.row, 'mapMenuUnlockEventId') > 0);
    let named = 0;
    const samples: string[] = [];
    for (const { id, row } of placed) {
      const g = graceByFlag.get(num(row, 'mapMenuUnlockEventId'));
      if (g) {
        named++;
        if (samples.length < 18)
          samples.push(`  region ${id} → grace "${g.name}" [${g.region}]`);
      }
    }
    console.log(
      `\nPlayRegions with mapMenuUnlockEventId>0: ${placed.length}; of those named via grace: ${named}`,
    );
    console.log(samples.join('\n'));

    // Cross-check vs legacy REGIONS: are the legacy ids PlayRegion rows, and does
    // the grace-derived name match?
    const legacy: Array<[number, string]> = [
      [6100090, 'Church of Dragon Communion'],
      [6100000, 'The First Step, Church of Elleh'],
      [6101000, 'Gatefront'],
      [3002001, 'Stormveil Castle'],
    ];
    const prById = new Map(regions.map((x) => [x.id, x.row]));
    console.log('\n=== legacy REGION id cross-check ===');
    for (const [id, legName] of legacy) {
      const row = prById.get(id);
      if (!row) {
        console.log(`  ${id} "${legName}" → NOT a PlayRegion row`);
        continue;
      }
      const evt = num(row, 'mapMenuUnlockEventId');
      const g = graceByFlag.get(evt);
      console.log(
        `  ${id} "${legName}" → unlockEvt ${evt} → grace "${g?.name ?? '(none)'}"`,
      );
    }
  }),
);
