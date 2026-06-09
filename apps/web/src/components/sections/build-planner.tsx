import { SCALING_ATTRS, type ScalingAttr } from '@elden-ring-compass/data/ar';
import {
  PackageCheckIcon,
  RefreshCcwIcon,
  RotateCcwIcon,
  TargetIcon,
  TrendingUpIcon,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { MAX_UPGRADE_LEVEL } from '@/lib/ar';
import {
  type BuildArchetype,
  BUILD_ARCHETYPES,
  type BuildArchetypeKey,
  buildArchetypeByKey,
  detectArchetype,
  STATUS_ARCHETYPES,
  weaponScalesWith,
} from '@/lib/build-archetypes';
import {
  arAttrsFromAttrs8,
  type Attr8Key,
  type Attrs8,
  ATTR_META,
  attrs8FromSlot,
  equipLoad,
  EQUIP_LOAD_MAX,
  fp,
  FP_MAX,
  hp,
  HP_MAX,
  levelFromAttrs8,
  OFFENSIVE_KEYS,
  runesBetween,
  stamina,
  STAMINA_MAX,
  VAGABOND,
} from '@/lib/build-stats';
import { cn } from '@/lib/utils';
import { equippedWeaponInfo } from '@/lib/vm/equipped-weapon';
import { inventoryDbView } from '@/lib/vm/inventory';
import { bestAffinityPerWeapon, type RatedWeapon, rateWeapons } from '@/lib/weapon-rating';
import { useSelectedSlot } from '@/stores/slot-selection-store';

import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Slider } from '../ui/slider';
import { ToggleGroup, ToggleGroupItem } from '../ui/toggle-group';
import { WeaponArTable } from './weapon-ar-calculator';

const SCALING_LABEL: Record<ScalingAttr, string> = {
  str: 'Str',
  dex: 'Dex',
  int: 'Int',
  fai: 'Fai',
  arc: 'Arc',
};

const sliderNum = (v: number | readonly number[]): number =>
  typeof v === 'number' ? v : (v[0] ?? 0);

type ArchetypeChoice = BuildArchetypeKey | 'custom';

/**
 * Build Doctor — the Calculator view. Playstyle-first: pick an archetype (or it's
 * auto-detected from your save) and the page answers, for your actual character,
 * what to equip now, where to spend your next level-up points, and whether to
 * respec — backed by the save-aware Weapon AR ranking. One shared attribute model
 * (see docs/projects/calculator.md).
 */
export function BuildPlannerSection() {
  const slot = useSelectedSlot();

  const current = useMemo<Attrs8>(() => (slot ? attrs8FromSlot(slot) : VAGABOND), [slot]);
  const initialKey: ArchetypeChoice = slot ? detectArchetype(current) : 'strength';

  const [archetypeKey, setArchetypeKey] = useState<ArchetypeChoice>(initialKey);
  // The sliders represent the *target* build you're planning toward; an archetype
  // seeds them, dragging switches to "Custom".
  const [target, setTarget] = useState<Attrs8>(
    () => buildArchetypeByKey.get(initialKey)?.target ?? current,
  );
  const [rankContext, setRankContext] = useState<'target' | 'current'>('target');

  // Re-detect + reseed whenever the active save changes (connect / switch slot).
  useEffect(() => {
    if (!slot) return;
    const k = detectArchetype(attrs8FromSlot(slot));
    setArchetypeKey(k);
    setTarget(buildArchetypeByKey.get(k)?.target ?? attrs8FromSlot(slot));
  }, [slot]);

  const archetype: BuildArchetype | undefined =
    archetypeKey === 'custom' ? undefined : buildArchetypeByKey.get(archetypeKey);

  const pickArchetype = (key: ArchetypeChoice) => {
    setArchetypeKey(key);
    if (key !== 'custom') {
      const preset = buildArchetypeByKey.get(key);
      if (preset) setTarget(preset.target);
    }
  };

  const setAttr = (key: Attr8Key, value: number) => {
    setArchetypeKey('custom');
    setTarget((prev) => ({ ...prev, [key]: value }));
  };

  const resetTarget = () => {
    if (archetype) setTarget(archetype.target);
    else setTarget(current);
  };
  const dirty = archetype
    ? ATTR_META.some((m) => target[m.key] !== archetype.target[m.key])
    : false;

  // weapon id → highest owned upgrade level, from the save's inventory.
  const ownedById = useMemo(() => {
    const owned = new Map<number, number>();
    if (slot) {
      for (const item of inventoryDbView(slot).items) {
        if (item.type !== 'WEAPON') continue;
        owned.set(item.item_id, Math.max(owned.get(item.item_id) ?? 0, item.upgrade_level));
      }
    }
    return owned;
  }, [slot]);

  // Rate the whole armament set at the target build and at the real current stats
  // (both at max upgrade — "potential"). The advisors read the top of each list.
  const ratedAtTarget = useMemo(
    () => rateWeapons(arAttrsFromAttrs8(target), MAX_UPGRADE_LEVEL, false, ownedById),
    [target, ownedById],
  );
  const ratedAtCurrent = useMemo(
    () => rateWeapons(arAttrsFromAttrs8(current), MAX_UPGRADE_LEVEL, false, ownedById),
    [current, ownedById],
  );

  // All "best weapon" answers are filtered to weapons that fit the chosen build
  // (so a Sorcery pick stops surfacing Giant-Crusher), differing only by which
  // stat context they rank at: the target build (potential) vs your current stats.
  const bestOwnedForBuild = useMemo(
    () =>
      topWeapon(
        ratedAtTarget.filter(
          (r) => r.owned && r.wieldable && (!archetype || weaponScalesWith(r.scaling, archetype)),
        ),
      ),
    [ratedAtTarget, archetype],
  );
  const bestObtainable = useMemo(
    () =>
      topWeapon(
        bestAffinityPerWeapon(
          ratedAtTarget.filter(
            (r) => !r.owned && (!archetype || weaponScalesWith(r.scaling, archetype)),
          ),
        ),
      ),
    [ratedAtTarget, archetype],
  );
  // The single strongest thing in the bag at your *current* stats, *any* build —
  // a clearly-labelled aside ("what hits hardest right now"), not a build pick.
  const strongestOwned = useMemo(
    () => topWeapon(ratedAtCurrent.filter((r) => r.owned && r.wieldable)),
    [ratedAtCurrent],
  );
  const statusBuild = archetype ? STATUS_ARCHETYPES.has(archetype.key) : false;

  const equipped = useMemo(() => (slot ? equippedWeaponInfo(slot) : null), [slot]);

  const levelTarget = levelFromAttrs8(target);
  const currentLevel = slot ? slot.player_game_data.level : levelFromAttrs8(current);

  // Derived survival stats. ER's HP/FP/stamina growth curves live in the game
  // executable, not in regulation.bin, so they can't be extracted — BUT the save
  // already carries the EXACT attribute-derived values (`base_max_*`). Use those
  // whenever a stat is unchanged from the save; only stats dragged to a
  // hypothetical target fall back to the modelled curve. (Equip load isn't stored
  // in the save, so it's always modelled.)
  const pgd = slot?.player_game_data;
  const hpVal = pgd && target.vigor === current.vigor ? pgd.base_max_hp : hp(target.vigor);
  const fpVal = pgd && target.mind === current.mind ? pgd.base_max_fp : fp(target.mind);
  const staminaVal =
    pgd && target.endurance === current.endurance
      ? pgd.base_max_stamina
      : stamina(target.endurance);

  const tableAttrs = rankContext === 'current' ? current : target;

  return (
    <div className='space-y-5'>
      {/* Playstyle picker — replaces the old non-interactive "Plan a build" banner. */}
      <Card>
        <CardHeader>
          <CardTitle>What do you want to play?</CardTitle>
          <CardDescription>
            {slot
              ? 'Pre-selected from your save. Pick a playstyle and the advice below retargets to it.'
              : 'Pick a playstyle to plan toward, or connect a save for advice tailored to your character.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ToggleGroup
            spacing={2}
            className='flex-wrap'
            value={[archetypeKey]}
            onValueChange={(v) => {
              const next = v[v.length - 1] as ArchetypeChoice | undefined;
              if (next) pickArchetype(next);
            }}
          >
            {BUILD_ARCHETYPES.map((a) => {
              const Icon = a.icon;
              return (
                <ToggleGroupItem
                  key={a.key}
                  value={a.key}
                  variant='outline'
                  size='sm'
                  title={a.blurb}
                  className='gap-1.5 data-[state=on]:border-primary/60 data-[state=on]:bg-primary/10 data-[state=on]:text-foreground'
                >
                  <Icon className='size-4' />
                  {a.label}
                </ToggleGroupItem>
              );
            })}
            <ToggleGroupItem
              value='custom'
              variant='outline'
              size='sm'
              title='Your own slider build'
              className='data-[state=on]:border-primary/60 data-[state=on]:bg-primary/10 data-[state=on]:text-foreground'
            >
              Custom
            </ToggleGroupItem>
          </ToggleGroup>
          {archetype && <p className='mt-3 text-sm text-muted-foreground'>{archetype.blurb}</p>}
        </CardContent>
      </Card>

      {/* Advisors */}
      <div className='grid gap-4 md:grid-cols-2'>
        {/* OWN: the best weapon you already have for this build. */}
        <AdvisorCard
          icon={<PackageCheckIcon className='size-4' />}
          title={archetype ? `Best ${archetype.label} weapon you own` : 'Best weapon you own'}
        >
          {!slot ? (
            <Muted>Connect a save to see the best weapon you already own for this build.</Muted>
          ) : bestOwnedForBuild ? (
            <>
              <AdvisorLine
                weapon={bestOwnedForBuild}
                lead='Equip this:'
                context={archetype ? `best fit at a ${archetype.label} stat spread` : undefined}
              />
              {strongestOwned && strongestOwned.id !== bestOwnedForBuild.id && (
                <Muted>
                  Hardest-hitter right now (any build):{' '}
                  <strong className='text-foreground'>{strongestOwned.name}</strong>{' '}
                  {strongestOwned.ar} AR at your Lvl {currentLevel}.
                </Muted>
              )}
              {statusBuild && (
                <Muted>Ranked by raw AR — bleed/status buildup isn&apos;t modelled yet.</Muted>
              )}
            </>
          ) : (
            <Muted>
              You don&apos;t own a weapon that scales for this build yet — see &ldquo;Aim
              for&rdquo;.
              {strongestOwned && (
                <>
                  {' '}
                  Your current hardest-hitter is{' '}
                  <strong className='text-foreground'>{strongestOwned.name}</strong> (
                  {strongestOwned.ar} AR).
                </>
              )}
            </Muted>
          )}
        </AdvisorCard>

        {/* CHASE: the best weapon you don't own yet for this build. */}
        <AdvisorCard
          icon={<TargetIcon className='size-4' />}
          title={archetype ? `Aim for (${archetype.label})` : 'Aim for'}
        >
          {bestObtainable ? (
            <>
              <AdvisorLine
                weapon={bestObtainable}
                lead="Don't own yet:"
                context={
                  slot && bestOwnedForBuild && bestObtainable.ar > bestOwnedForBuild.ar
                    ? `+${bestObtainable.ar - bestOwnedForBuild.ar} AR over your best owned`
                    : 'top pick for this build'
                }
              />
              <Muted>Where to find it on the map is coming next.</Muted>
            </>
          ) : (
            <Muted>No unowned weapon scores higher for this build.</Muted>
          )}
        </AdvisorCard>

        <AdvisorCard icon={<TrendingUpIcon className='size-4' />} title='Next level-up'>
          <LevelUpAdvice current={current} target={target} />
        </AdvisorCard>

        <AdvisorCard icon={<RotateCcwIcon className='size-4' />} title='Respec verdict'>
          <RespecVerdict
            slot={slot}
            current={current}
            target={target}
            archetype={archetype}
            equipped={equipped}
            currentLevel={currentLevel}
            levelTarget={levelTarget}
          />
        </AdvisorCard>
      </div>

      {/* Attribute planner + derived readouts */}
      <div className='grid gap-5 lg:grid-cols-[1.4fr_1fr]'>
        <Card>
          <CardHeader className='flex-row items-start justify-between gap-2 space-y-0'>
            <div>
              <CardTitle>Target attributes</CardTitle>
              <CardDescription>
                Ticks mark soft caps.{' '}
                {archetype ? `Seeded from the ${archetype.label} build.` : 'Custom build.'}
              </CardDescription>
            </div>
            <Button
              variant='outline'
              size='sm'
              disabled={!dirty}
              onClick={resetTarget}
              title={dirty ? `Reset to the ${archetype?.label ?? 'detected'} build` : undefined}
            >
              <RefreshCcwIcon /> Reset
            </Button>
          </CardHeader>
          <CardContent className='space-y-3.5'>
            {ATTR_META.map((m) => (
              <div key={m.key} className='flex items-center gap-3'>
                <span className='w-24 shrink-0 text-sm'>{m.label}</span>
                <div className='relative flex-1'>
                  <Slider
                    min={1}
                    max={99}
                    value={target[m.key]}
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
                  {target[m.key]}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className='flex flex-col gap-5'>
          <Card>
            <CardHeader>
              <CardTitle>Derived stats</CardTitle>
              <CardDescription>
                {slot
                  ? 'Exact from your save (modelled only for stats you change).'
                  : 'HP, FP, stamina & equip load for this build.'}
              </CardDescription>
            </CardHeader>
            <CardContent className='grid grid-cols-2 gap-3'>
              <DerivedStat label='HP' value={hpVal} ratio={hpVal / HP_MAX} />
              <DerivedStat label='FP' value={fpVal} ratio={fpVal / FP_MAX} />
              <DerivedStat label='Stamina' value={staminaVal} ratio={staminaVal / STAMINA_MAX} />
              <DerivedStat
                label='Equip Load'
                value={equipLoad(target.endurance)}
                ratio={equipLoad(target.endurance) / EQUIP_LOAD_MAX}
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
                <span className='font-mono text-2xl font-semibold tabular-nums'>{levelTarget}</span>
              </div>
              <div className='h-px bg-border' />
              <div className='flex items-center justify-between'>
                <span className='text-sm text-muted-foreground'>From Level 1</span>
                <span className='font-mono font-semibold tabular-nums'>
                  {runesBetween(1, levelTarget).toLocaleString()}
                </span>
              </div>
              {slot && (
                <div className='flex items-center justify-between'>
                  <span className='text-sm text-muted-foreground'>
                    From your Lvl {currentLevel}
                  </span>
                  <span className='font-mono font-semibold tabular-nums'>
                    {runesBetween(
                      Math.min(currentLevel, levelTarget),
                      Math.max(currentLevel, levelTarget),
                    ).toLocaleString()}
                    {levelTarget < currentLevel ? ' (respec)' : ''}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Rank context + the full ranked table */}
      <div className='flex flex-wrap items-center gap-2'>
        <span className='text-sm text-muted-foreground'>Rank weapons at</span>
        <ToggleGroup
          spacing={0}
          className='rounded-lg border border-border bg-muted/50 p-0.5'
          value={[rankContext]}
          onValueChange={(v) => {
            const next = v[v.length - 1] as 'target' | 'current' | undefined;
            if (next) setRankContext(next);
          }}
        >
          <ToggleGroupItem
            value='target'
            size='sm'
            className='rounded-md px-3 text-muted-foreground data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm'
          >
            Target build
          </ToggleGroupItem>
          <ToggleGroupItem
            value='current'
            size='sm'
            disabled={!slot}
            className='rounded-md px-3 text-muted-foreground data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm'
          >
            My current stats
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <WeaponArTable
        attrs={arAttrsFromAttrs8(tableAttrs)}
        archetype={archetype}
        ownedById={ownedById}
      />
    </div>
  );
}

const topWeapon = (list: readonly RatedWeapon[]): RatedWeapon | undefined =>
  list.reduce<RatedWeapon | undefined>(
    (best, r) => (!best || r.ar > best.ar ? r : best),
    undefined,
  );

const scaleAttrsOf = (scaling: Readonly<Partial<Record<ScalingAttr, number>>>): ScalingAttr[] =>
  SCALING_ATTRS.filter((a) => (scaling[a] ?? 0) > 0);

function Muted({ children }: { children: React.ReactNode }) {
  return <p className='text-sm text-muted-foreground'>{children}</p>;
}

function AdvisorCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className='pb-3'>
        <CardTitle className='flex items-center gap-2 text-base'>
          <span className='flex size-7 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground'>
            {icon}
          </span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-2'>{children}</CardContent>
    </Card>
  );
}

function AdvisorLine({
  weapon,
  lead,
  context,
  muted,
}: {
  weapon: RatedWeapon;
  lead: string;
  context?: string;
  muted?: boolean;
}) {
  return (
    <p className={cn('text-sm', muted && 'text-muted-foreground')}>
      <span className={cn(muted ? 'text-muted-foreground' : 'text-muted-foreground')}>{lead} </span>
      <strong className='text-foreground'>{weapon.name}</strong>{' '}
      <span className='font-mono tabular-nums text-foreground'>{weapon.ar} AR</span>
      {context && <span className='text-muted-foreground'> · {context}</span>}
    </p>
  );
}

function LevelUpAdvice({ current, target }: { current: Attrs8; target: Attrs8 }) {
  const need = (k: Attr8Key) => Math.max(0, target[k] - current[k]);
  const primary = OFFENSIVE_KEYS.filter((k) => target[k] >= 30).toSorted(
    (a, b) => target[b] - target[a],
  );

  const rec = (() => {
    // Survival nudge — but only toward the Vigor *you* set as a target (drag the
    // slider to weight health however you like). The ~40 figure is a community
    // rule of thumb, not a rule.
    if (current.vigor < Math.min(target.vigor, 40) && need('vigor') > 0)
      return {
        key: 'vigor' as Attr8Key,
        reason: 'health is low — most builds want ~40 Vigor first',
      };
    const prim = primary.find((k) => need(k) > 0);
    if (prim) return { key: prim, reason: `your main damage stat (${need(prim)} to target)` };
    if (need('mind') > 0) return { key: 'mind' as Attr8Key, reason: 'more FP for casts' };
    if (need('endurance') > 0)
      return { key: 'endurance' as Attr8Key, reason: 'stamina + equip load' };
    if (need('vigor') > 0) return { key: 'vigor' as Attr8Key, reason: 'more survivability' };
    const any = ATTR_META.map((m) => m.key).find((k) => need(k) > 0);
    return any ? { key: any, reason: 'toward your target build' } : null;
  })();

  const label = (k: Attr8Key) => ATTR_META.find((m) => m.key === k)?.label ?? k;

  if (!rec) return <Muted>You&apos;ve already hit this build&apos;s targets. Spend freely.</Muted>;

  return (
    <>
      <p className='text-sm'>
        Put your next point in <strong className='text-foreground'>{label(rec.key)}</strong>{' '}
        <span className='font-mono text-muted-foreground'>
          {current[rec.key]} → {target[rec.key]}
        </span>
      </p>
      <Muted>{rec.reason}. Remaining to your target:</Muted>
      <div className='flex flex-wrap gap-1.5'>
        {ATTR_META.filter((m) => need(m.key) > 0).map((m) => (
          <span
            key={m.key}
            className='rounded-md border border-border bg-muted/40 px-1.5 py-0.5 text-[11px] tabular-nums text-muted-foreground'
          >
            {m.label} +{need(m.key)}
          </span>
        ))}
      </div>
      <Muted>How much Vigor is up to you — drag its slider to set your own health target.</Muted>
    </>
  );
}

function RespecVerdict({
  slot,
  current,
  target,
  archetype,
  equipped,
  currentLevel,
  levelTarget,
}: {
  slot: ReturnType<typeof useSelectedSlot>;
  current: Attrs8;
  target: Attrs8;
  archetype: BuildArchetype | undefined;
  equipped: ReturnType<typeof equippedWeaponInfo>;
  currentLevel: number;
  levelTarget: number;
}) {
  if (!slot)
    return <Muted>Connect a save for a respec recommendation tailored to your build.</Muted>;

  const label = (k: Attr8Key) => ATTR_META.find((m) => m.key === k)?.label ?? k;
  const buildLabel = archetype?.label ?? 'this';

  // Only *offensive* points sunk into a stat this build doesn't use are "stranded"
  // — those are what a respec actually reclaims. Vigor/Mind/Endurance are personal
  // survival/utility choices and are never counted as waste. Up to ~15 in an
  // off-stat is usually just meeting a weapon's requirement (splash), not waste.
  const SPLASH = 15;
  const primaryKeys: ReadonlyArray<Attr8Key> = archetype
    ? archetype.primary
    : OFFENSIVE_KEYS.filter((k) => target[k] >= 30);
  const strandedByStat = OFFENSIVE_KEYS.filter((k) => !primaryKeys.includes(k))
    .map((k) => ({ key: k, n: Math.max(0, current[k] - SPLASH) }))
    .filter((x) => x.n > 0)
    .toSorted((a, b) => b.n - a.n);
  const stranded = strandedByStat.reduce((s, x) => s + x.n, 0);
  const strandedLabels = strandedByStat.slice(0, 2).map((x) => label(x.key));

  const mismatch =
    archetype && equipped
      ? !archetype.scaleAttrs.some((a) => (equipped.scaling.scaling[a] ?? 0) > 0)
      : false;

  const RESPEC_THRESHOLD = 10;
  const needsRespec = stranded >= RESPEC_THRESHOLD;
  const extraLevels = levelTarget > currentLevel ? levelTarget - currentLevel : 0;

  return (
    <>
      {needsRespec ? (
        <p className='text-sm'>
          <strong className='text-foreground'>Respec worth it.</strong> ~{stranded} points sit in{' '}
          {strandedLabels.join(' & ')} — stats a {buildLabel} build doesn&apos;t use.
        </p>
      ) : mismatch && equipped ? (
        <p className='text-sm'>
          <strong className='text-foreground'>Loadout mismatch.</strong> Your {equipped.name} scales
          with{' '}
          {scaleAttrsOf(equipped.scaling.scaling)
            .map((a) => SCALING_LABEL[a])
            .join('/')}
          , but a {buildLabel} build leans on{' '}
          {archetype?.scaleAttrs.map((a) => SCALING_LABEL[a]).join('/')}. Swap weapon — your stats
          are fine.
        </p>
      ) : (
        <p className='text-sm'>
          <strong className='text-foreground'>No respec needed.</strong> Your offensive stats
          already suit a {buildLabel} build. Vigor, Mind &amp; Endurance are your call.
        </p>
      )}
      {needsRespec && extraLevels > 0 && (
        <Muted>
          You&apos;d also need {extraLevels} more levels ({currentLevel}→{levelTarget}) ·{' '}
          {runesBetween(currentLevel, levelTarget).toLocaleString()} runes.
        </Muted>
      )}
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
