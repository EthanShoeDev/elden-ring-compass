import { RefreshCcwIcon, SlidersHorizontalIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import type { Attributes } from '@/lib/ar';
import { useSelectedSlot } from '@/stores/slot-selection-store';

import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Slider } from '../ui/slider';
import { WeaponArTable } from './weapon-ar-calculator';

// The 8 character attributes, with their community soft-cap breakpoints (where
// returns visibly diminish). Ticks on each slider mark these.
type Attr8Key =
  | 'vigor'
  | 'mind'
  | 'endurance'
  | 'strength'
  | 'dexterity'
  | 'intelligence'
  | 'faith'
  | 'arcane';

const ATTR_META: ReadonlyArray<{ key: Attr8Key; label: string; softCaps: ReadonlyArray<number> }> =
  [
    { key: 'vigor', label: 'Vigor', softCaps: [40, 60] },
    { key: 'mind', label: 'Mind', softCaps: [50, 60] },
    { key: 'endurance', label: 'Endurance', softCaps: [50, 60] },
    { key: 'strength', label: 'Strength', softCaps: [20, 55, 80] },
    { key: 'dexterity', label: 'Dexterity', softCaps: [20, 55, 80] },
    { key: 'intelligence', label: 'Intelligence', softCaps: [20, 55, 80] },
    { key: 'faith', label: 'Faith', softCaps: [20, 55, 80] },
    { key: 'arcane', label: 'Arcane', softCaps: [20, 55, 80] },
  ];

type Attrs8 = Record<Attr8Key, number>;

// Vagabond starting stats (level 9) — a sensible default when no save is loaded.
const VAGABOND: Attrs8 = {
  vigor: 15,
  mind: 10,
  endurance: 11,
  strength: 14,
  dexterity: 13,
  intelligence: 9,
  faith: 9,
  arcane: 7,
};

type Slot = NonNullable<ReturnType<typeof useSelectedSlot>>;
const attrs8FromSlot = (slot: Slot): Attrs8 => ({
  vigor: slot.player_game_data.vigor,
  mind: slot.player_game_data.mind,
  endurance: slot.player_game_data.endurance,
  strength: slot.player_game_data.strength,
  dexterity: slot.player_game_data.dexterity,
  intelligence: slot.player_game_data.intelligence,
  faith: slot.player_game_data.faith,
  arcane: slot.player_game_data.arcane,
});

// Piecewise-linear interpolation of the in-game derived-stat curves. These are
// documented approximations (anchors from the wiki tables), clearly labelled as
// estimates in the UI — the exact tables aren't in our extracted data.
type Anchor = readonly [stat: number, value: number];
function lerpCurve(anchors: ReadonlyArray<Anchor>, x: number): number {
  const first = anchors[0];
  const last = anchors[anchors.length - 1];
  if (!first || !last) return 0;
  if (x <= first[0]) return first[1];
  if (x >= last[0]) return last[1];
  for (let i = 0; i < anchors.length - 1; i++) {
    const a = anchors[i];
    const b = anchors[i + 1];
    if (!a || !b) continue;
    const [x0, y0] = a;
    const [x1, y1] = b;
    if (x >= x0 && x <= x1) return y0 + (y1 - y0) * ((x - x0) / (x1 - x0));
  }
  return last[1];
}
const HP_C: ReadonlyArray<Anchor> = [
  [1, 300],
  [10, 442],
  [20, 633],
  [25, 800],
  [30, 968],
  [40, 1450],
  [50, 1645],
  [60, 1900],
  [99, 2138],
];
const FP_C: ReadonlyArray<Anchor> = [
  [1, 50],
  [10, 75],
  [15, 95],
  [20, 106],
  [35, 220],
  [50, 350],
  [55, 355],
  [60, 365],
  [99, 458],
];
const ST_C: ReadonlyArray<Anchor> = [
  [1, 80],
  [8, 96],
  [15, 105],
  [30, 130],
  [50, 155],
  [99, 170],
];
const EQ_C: ReadonlyArray<Anchor> = [
  [1, 45],
  [8, 52],
  [25, 72],
  [30, 79],
  [60, 120],
  [99, 160],
];
const hp = (v: number) => Math.round(lerpCurve(HP_C, v));
const fp = (v: number) => Math.round(lerpCurve(FP_C, v));
const stamina = (v: number) => Math.round(lerpCurve(ST_C, v));
const equipLoad = (v: number) => Math.round(lerpCurve(EQ_C, v) * 10) / 10;

// Approximate FromSoft level-up rune cost curve (estimate).
const runeForLevel = (level: number) => Math.round(0.1 * level ** 3 + 100 * level);
function runesBetween(a: number, b: number): number {
  if (b <= a) return 0;
  let total = 0;
  for (let lvl = a + 1; lvl <= b; lvl++) total += runeForLevel(lvl);
  return total;
}

const sliderNum = (v: number | readonly number[]): number =>
  typeof v === 'number' ? v : (v[0] ?? 0);

/**
 * Build Planner — the Calculator view. Soft-cap-aware attribute sliders
 * (prefilled from the connected save) drive three things at once: estimated
 * derived stats, a rune-cost readout, and the live Weapon AR ranking below. One
 * attribute model, every calculator reads from it (see
 * docs/projects/min-maxing-calculators.md).
 */
export function BuildPlannerSection() {
  const slot = useSelectedSlot();
  const [attrs, setAttrs] = useState<Attrs8>(() => (slot ? attrs8FromSlot(slot) : VAGABOND));

  // Re-sync whenever the active save changes (connect / switch slot). Manual
  // tweaks persist until then (the effect only refires on `slot` identity).
  useEffect(() => {
    if (slot) setAttrs(attrs8FromSlot(slot));
  }, [slot]);

  const setAttr = (key: Attr8Key, value: number) => {
    setAttrs((prev) => ({ ...prev, [key]: value }));
  };
  // The baseline this view resets to (your save, or Vagabond defaults). Reset is
  // only meaningful once you've dragged something away from it.
  const baseline = useMemo(() => (slot ? attrs8FromSlot(slot) : VAGABOND), [slot]);
  const dirty = ATTR_META.some((m) => attrs[m.key] !== baseline[m.key]);
  const reset = () => {
    setAttrs(baseline);
  };

  // Rune level = sum of the 8 attributes − 79 (Wretch starts at level 1 with all
  // 10s → 80 − 79). Exact for Elden Ring.
  const sum = ATTR_META.reduce((s, m) => s + attrs[m.key], 0);
  const level = Math.max(1, sum - 79);
  const currentLevel = slot ? slot.player_game_data.level : 1;
  const totalRunes = runesBetween(1, level);
  const fromCurrent = runesBetween(Math.min(currentLevel, level), Math.max(currentLevel, level));

  // The 5 attributes the AR formula reads, derived from the shared slider state.
  const arAttrs: Attributes = useMemo(
    () => ({
      str: attrs.strength,
      dex: attrs.dexterity,
      int: attrs.intelligence,
      fai: attrs.faith,
      arc: attrs.arcane,
    }),
    [attrs],
  );

  return (
    <>
      <div className='flex flex-wrap items-center gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm'>
        <span className='flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent'>
          <SlidersHorizontalIcon className='size-4' />
        </span>
        <span>
          <span className='font-medium'>Plan a build</span>{' '}
          <span className='text-muted-foreground'>
            {slot
              ? 'pre-filled from your save'
              : 'drag attributes to see derived stats, soft caps & rune cost'}
          </span>
        </span>
        <Button
          variant='outline'
          size='sm'
          className='ml-auto'
          disabled={!dirty}
          onClick={reset}
          title={dirty ? `Reset to ${slot ? 'your save' : 'Vagabond'}` : undefined}
        >
          <RefreshCcwIcon /> Reset
        </Button>
      </div>

      <div className='grid gap-5 lg:grid-cols-[1.4fr_1fr]'>
        {/* Attribute planner */}
        <Card>
          <CardHeader>
            <CardTitle>Attributes</CardTitle>
            <CardDescription>Ticks mark soft caps — diminishing returns past them.</CardDescription>
          </CardHeader>
          <CardContent className='space-y-3.5'>
            {ATTR_META.map((m) => (
              <div key={m.key} className='flex items-center gap-3'>
                <span className='w-24 shrink-0 text-sm'>{m.label}</span>
                <div className='relative flex-1'>
                  <Slider
                    min={1}
                    max={99}
                    value={attrs[m.key]}
                    onValueChange={(v) => {
                      setAttr(m.key, sliderNum(v));
                    }}
                  />
                  {m.softCaps.map((cap) => (
                    <span
                      key={cap}
                      title={`Soft cap at ${cap}`}
                      className='pointer-events-none absolute top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground/50 ring-2 ring-background'
                      style={{ left: `${((cap - 1) / 98) * 100}%` }}
                    />
                  ))}
                </div>
                <span className='w-7 shrink-0 text-right font-mono text-sm tabular-nums'>
                  {attrs[m.key]}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Derived + rune cost */}
        <div className='flex flex-col gap-5'>
          <Card>
            <CardHeader>
              <CardTitle>Derived stats</CardTitle>
              <CardDescription>Estimated — curves approximate the in-game tables.</CardDescription>
            </CardHeader>
            <CardContent className='grid grid-cols-2 gap-3'>
              <DerivedStat label='HP' value={hp(attrs.vigor)} ratio={hp(attrs.vigor) / 2138} />
              <DerivedStat label='FP' value={fp(attrs.mind)} ratio={fp(attrs.mind) / 458} />
              <DerivedStat
                label='Stamina'
                value={stamina(attrs.endurance)}
                ratio={stamina(attrs.endurance) / 170}
              />
              <DerivedStat
                label='Equip Load'
                value={equipLoad(attrs.endurance)}
                ratio={equipLoad(attrs.endurance) / 160}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Rune cost</CardTitle>
              <CardDescription>Runes to reach this build (estimate).</CardDescription>
            </CardHeader>
            <CardContent className='space-y-3'>
              <div className='flex items-center justify-between'>
                <span className='text-sm text-muted-foreground'>Rune Level</span>
                <span className='font-mono text-2xl font-semibold tabular-nums'>{level}</span>
              </div>
              <div className='h-px bg-border' />
              <div className='flex items-center justify-between'>
                <span className='text-sm text-muted-foreground'>From Level 1</span>
                <span className='font-mono font-semibold tabular-nums'>
                  {totalRunes.toLocaleString()}
                </span>
              </div>
              {slot && (
                <div className='flex items-center justify-between'>
                  <span className='text-sm text-muted-foreground'>
                    From your Lvl {currentLevel}
                  </span>
                  <span className='font-mono font-semibold tabular-nums'>
                    {fromCurrent.toLocaleString()}
                    {level < currentLevel ? ' (respec)' : ''}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <WeaponArTable attrs={arAttrs} />
    </>
  );
}

function DerivedStat({ label, value, ratio }: { label: string; value: number; ratio: number }) {
  return (
    <div className='flex flex-col gap-1.5 rounded-lg border border-border bg-muted/30 p-3'>
      <div className='text-[11px] font-medium tracking-wide text-muted-foreground uppercase'>
        {label}
      </div>
      <div className='text-xl font-semibold tabular-nums'>{value.toLocaleString()}</div>
      <div className='h-1.5 overflow-hidden rounded-full bg-muted'>
        <div
          className='h-full rounded-full bg-primary'
          style={{ width: `${Math.min(100, ratio * 100)}%` }}
        />
      </div>
    </div>
  );
}
