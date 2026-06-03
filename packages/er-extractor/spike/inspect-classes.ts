import { Effect } from 'effect';

import { parseBnd4 } from '../src/formats/bnd4.ts';
import { dcxDecompress } from '../src/formats/dcx.ts';
import { parseFmg } from '../src/formats/fmg.ts';
import { findOodleDll } from '../src/external/oodle.ts';

const GAME = 'C:/Program Files (x86)/Steam/steamapps/common/ELDEN RING/Game';
const NEEDLES = ['Vagabond', 'Astrologer', 'Wretch', 'Confessor', 'Prisoner'];

await Effect.runPromise(
  Effect.gen(function* () {
    const oo2 = yield* findOodleDll(GAME);
    for (const rel of ['menu.msgbnd.dcx', 'item.msgbnd.dcx']) {
      const path = `${GAME}/msg/engus/${rel}`;
      if (!(yield* Effect.promise(() => Bun.file(path).exists()))) continue;
      const dcx = new Uint8Array(
        yield* Effect.promise(() => Bun.file(path).arrayBuffer()),
      );
      const entries = yield* parseBnd4(yield* dcxDecompress(dcx, oo2));
      for (const e of entries) {
        const base = (e.name ?? '').split(/[\\/]/).pop() ?? '';
        if (!base.toLowerCase().endsWith('.fmg')) continue;
        let table: Map<number, string>;
        try {
          table = yield* parseFmg(e.bytes);
        } catch {
          continue;
        }
        const hits: Array<[number, string]> = [];
        for (const [id, name] of table) {
          if (NEEDLES.some((n) => name === n)) hits.push([id, name]);
        }
        if (hits.length >= 3) {
          console.log(`\n*** ${rel} :: ${base} — ${table.size} entries ***`);
          // Dump the contiguous block around the class names (ids tend to be sequential).
          const ids = hits.map(([i]) => i).sort((a, b) => a - b);
          const lo = ids[0]! - 2;
          const hi = ids[ids.length - 1]! + 2;
          for (let i = lo; i <= hi; i++) {
            const v = table.get(i);
            if (v) console.log(`  ${i}: "${v}"`);
          }
        }
      }
    }
  }),
);
