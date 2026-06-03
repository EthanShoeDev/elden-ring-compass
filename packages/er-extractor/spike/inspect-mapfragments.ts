import { Effect } from 'effect';

import { decodeRow, parseParam, type RowValue } from '../src/formats/param.ts';
import { loadParamdef } from '../src/formats/paramdef.ts';
import { findOodleDll } from '../src/external/oodle.ts';
import { loadFmgTable, ITEM_MSGBNDS } from '../src/game/fmg-tables.ts';
import { loadRegulationParams } from '../src/game/regulation.ts';

const GAME = 'C:/Program Files (x86)/Steam/steamapps/common/ELDEN RING/Game';
const num = (row: ReadonlyMap<string, RowValue>, k: string) => {
  const v = row.get(k);
  return typeof v === 'number' ? v : 0;
};

// Legacy MAPS flags we're trying to reproduce.
const LEGACY = new Set([
  62007, 62006, 62005, 62004, 62012, 62011, 62010, 62009, 62008, 62022, 62021,
  62020, 62031, 62030, 62032, 62041, 62040, 62052, 62051, 62050, 62063, 62062,
  62061, 62060, 62064, 62103, 62102, 82001,
]);

await Effect.runPromise(
  Effect.gen(function* () {
    const oo2 = yield* findOodleDll(GAME);
    const params = yield* loadRegulationParams(GAME, oo2);
    const placeName = yield* loadFmgTable(GAME, oo2, ITEM_MSGBNDS, 'PlaceName');

    const pieceBytes = params.get('WorldMapPieceParam')!;
    const piece = yield* parseParam(pieceBytes);
    const pieceDef = yield* loadParamdef('WorldMapPieceParam');
    const pieceById = new Map<number, ReadonlyMap<string, RowValue>>();
    for (const r of piece.rows)
      pieceById.set(r.id, decodeRow(pieceBytes, r.dataOffset, pieceDef, piece.little));
    console.log(`WorldMapPieceParam rows: ${piece.rows.length}`);

    const pnBytes = params.get('WorldMapPlaceNameParam')!;
    const pn = yield* parseParam(pnBytes);
    const pnDef = yield* loadParamdef('WorldMapPlaceNameParam');
    console.log(`WorldMapPlaceNameParam rows: ${pn.rows.length}`);

    // Join: PlaceNameParam.worldMapPieceId → piece.openEventFlagId; textId → PlaceName FMG.
    const rows: Array<{
      pieceId: number;
      flag: number;
      acq: number;
      name: string | undefined;
      area: number;
      gx: number;
      gz: number;
    }> = [];
    for (const r of pn.rows) {
      const f = decodeRow(pnBytes, r.dataOffset, pnDef, pn.little);
      const pieceId = num(f, 'worldMapPieceId');
      const textId = num(f, 'textId');
      const p = pieceById.get(pieceId);
      rows.push({
        pieceId,
        flag: p ? num(p, 'openEventFlagId') : -1,
        acq: p ? num(p, 'acquisitionEventFlagId') : -1,
        name: textId >= 0 ? placeName.get(textId) : undefined,
        area: num(f, 'areaNo'),
        gx: num(f, 'gridXNo'),
        gz: num(f, 'gridZNo'),
      });
    }

    const named = rows.filter((r) => r.name);
    console.log(`\nPlaceName rows with a resolved name: ${named.length}/${rows.length}`);
    for (const r of named.slice(0, 60))
      console.log(
        `  piece ${r.pieceId} flag=${r.flag} acq=${r.acq} area=${r.area} g=(${r.gx},${r.gz}) "${r.name}"`,
      );

    // How many legacy MAPS flags are reproduced (by openEventFlagId OR acquisitionEventFlagId)?
    const flagsSeen = new Set<number>();
    for (const r of rows) {
      if (r.flag > 0) flagsSeen.add(r.flag);
      if (r.acq > 0) flagsSeen.add(r.acq);
    }
    const hit = [...LEGACY].filter((f) => flagsSeen.has(f));
    const miss = [...LEGACY].filter((f) => !flagsSeen.has(f));
    console.log(
      `\nlegacy MAPS flags reproduced: ${hit.length}/${LEGACY.size}; missing: ${miss.join(', ')}`,
    );

    // Also: do those legacy flags appear ANYWHERE in WorldMapPieceParam?
    const pieceFlags = new Set<number>();
    for (const p of pieceById.values()) {
      const o = num(p, 'openEventFlagId');
      const a = num(p, 'acquisitionEventFlagId');
      if (o > 0) pieceFlags.add(o);
      if (a > 0) pieceFlags.add(a);
    }
    const pieceHit = [...LEGACY].filter((f) => pieceFlags.has(f));
    console.log(
      `legacy MAPS flags present in WorldMapPieceParam (any field): ${pieceHit.length}/${LEGACY.size}`,
    );
  }),
);
