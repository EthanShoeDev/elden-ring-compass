import { RegistryProvider } from '@effect/atom-react';
import { it } from '@effect/vitest';
import { Effect } from 'effect';
import { fireEvent, render, screen } from '@testing-library/react';
import { expect } from 'vitest';
import { CATALOG } from '@/lib/inventory-catalog';
import { forceGcHeapUsedBytes, mb } from '@/test/perf/cdp-memory';
import { commonAccessorColumnDef, commonPinColumnDef } from './common-column-defs';
import { DataTable } from './data-table';
import { createAppColumnHelper } from './table-hook';

// Data-table perf in real Chromium, mounting the REAL `DataTable` with the full armaments catalog
// (WEAPONS minus ammo — ~2.6 MB of source data, the heaviest table and the worst case). Covers the
// two things the user flagged as slow: initial mount and filtering. The catalog is the actual data
// the app filters with or without a save loaded, so no fixture/faker is involved.
//
// Thresholds start HIGH; ratchet down to your machine's real numbers via `bun run test:perf`.

const ARMAMENTS = CATALOG.armaments;
type Armament = (typeof ARMAMENTS)[number];

const helper = createAppColumnHelper<Armament>();
const columns = [
  commonPinColumnDef(helper),
  // The toolbar "Search" box filters the `Name` column; use a string-contains filter (not the
  // faceted default) so it does real work over every row.
  commonAccessorColumnDef(helper, 'name', 'Name', { filterFn: 'includesString' }),
  commonAccessorColumnDef(helper, 'category', 'Category'),
  commonAccessorColumnDef(helper, 'rarity', 'Rarity'),
];

const MOUNT_MS = 4000;
const FILTER_MS = 2000;
const MOUNT_HEAP_MB = 200;

it.effect('armaments table: mount + filter time and retained heap within bounds', () =>
  Effect.gen(function* () {
    const heapBefore = yield* Effect.promise(forceGcHeapUsedBytes);

    // Mount: render the real table + wait until the toolbar is interactive.
    const mountStart = performance.now();
    yield* Effect.sync(() =>
      render(
        <RegistryProvider>
          <DataTable tableId='armaments' columns={columns} data={ARMAMENTS} />
        </RegistryProvider>,
      ),
    );
    yield* Effect.promise(() => screen.findByPlaceholderText('Search'));
    const mountMs = performance.now() - mountStart;

    const heapAfter = yield* Effect.promise(forceGcHeapUsedBytes);
    const heapDeltaMb = mb(heapAfter - heapBefore);

    // Filter: type into the Name search → react-table recomputes the filtered row model over the
    // whole catalog → first page re-renders. Time until filtered rows are in the DOM.
    const input = screen.getByPlaceholderText('Search');
    const filterStart = performance.now();
    yield* Effect.sync(() => fireEvent.change(input, { target: { value: 'sword' } }));
    yield* Effect.promise(() => screen.findAllByText(/sword/i));
    const filterMs = performance.now() - filterStart;

    yield* Effect.log(
      `armaments (${ARMAMENTS.length} rows): mount ${mountMs.toFixed(1)}ms, ` +
        `filter ${filterMs.toFixed(1)}ms, retained +${heapDeltaMb}MB`,
    );

    expect(ARMAMENTS.length).toBeGreaterThan(100);
    expect(mountMs).toBeLessThan(MOUNT_MS);
    expect(filterMs).toBeLessThan(FILTER_MS);
    expect(heapDeltaMb).toBeLessThan(MOUNT_HEAP_MB);
  }),
);
