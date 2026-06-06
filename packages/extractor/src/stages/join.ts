import { Effect, FileSystem, Path } from 'effect';

import {
  decodeRow,
  type ParamError,
  parseParam,
  type RowValue,
} from '../formats/param.ts';
import { loadParamdef, type ParamdefError } from '../formats/paramdef.ts';
import {
  aggregateEffects,
  effectsFromSpEffectRow,
  type ItemEffect,
  weaponBaseEffects,
  withCondition,
} from '../game/effects.ts';
import type { ItemText } from '../game/item-text.ts';

/**
 * Stage 4 — join. Pairs item PARAM rows ⨝ their FMG text (name/summary/
 * description) and decodes the useful fields (via the vendored PARAMDEF) into the
 * records the site consumes — base + DLC together. Covers weapons (incl. ammo,
 * tagged by `category` from `wepType`), armor, talismans, and goods (tagged with a
 * `category` from `goodsType`, gestures by `sortGroupId`). Consumes the prior
 * stages' outputs (param files from `params`, text tables from `text`) rather than
 * re-loading. Ashes of war + weapon arts stay name-only (codegen emits them
 * straight from `text`). Effects, per-item icons, and the remaining per-category
 * stat fields are layered on in later increments (see the parity-audit plan).
 */

// Fields shared by every item category, sourced the same way across params/FMG.
export interface CoreItemFields {
  readonly summary: string; // *Info FMG (one-liner); weapons have none → ''
  readonly description: readonly string[]; // *Caption FMG, split on newlines
  readonly rarity: string; // 'Common' | 'Rare' | 'Legendary'
  readonly icon: number; // iconId (armor: iconIdM)
  readonly sellValue: number;
}

export interface WeaponRecord extends CoreItemFields {
  readonly id: number;
  readonly name: string;
  readonly category: string; // wepType → armament/ammo category (e.g. 'Dagger', 'Arrow')
  readonly allowAshOfWar: boolean; // gemMountType == 2 (ALLOW_CHANGE)
  readonly isBuffable: boolean; // isEnhance — accepts grease/spell weapon buffs
  readonly weight: number;
  readonly attackPhysical: number;
  readonly reqStrength: number;
  readonly reqDexterity: number;
  readonly reqIntelligence: number;
  readonly reqFaith: number;
  readonly reqArcane: number;
  readonly upgradeMaterial: string; // '' | 'Smithing Stone' | 'Somber Smithing Stone'
  readonly upgradeCosts: readonly number[]; // rune cost per upgrade level
  readonly effects: readonly ItemEffect[]; // base (vs-enemy) + resident + on-hit
}

export interface ArmorRecord extends CoreItemFields {
  readonly id: number;
  readonly name: string;
  readonly category: string; // protectorCategory → 'Head' | 'Body' | 'Arms' | 'Legs'
  readonly weight: number;
  // Damage negation %, as the game displays it (ER stores 0 in the legacy
  // defense* fields; negation comes from the *DamageCutRate floats).
  readonly negationPhysical: number;
  readonly negationStrike: number;
  readonly negationSlash: number;
  readonly negationPierce: number;
  readonly negationMagic: number;
  readonly negationFire: number;
  readonly negationLightning: number;
  readonly negationHoly: number;
  // Resistance points (the displayed status-buildup defenses).
  readonly resistPoison: number;
  readonly resistScarletRot: number;
  readonly resistBleed: number;
  readonly resistFrost: number;
  readonly resistSleep: number;
  readonly resistMadness: number;
  readonly resistDeath: number;
  readonly poise: number;
  readonly effects: readonly ItemEffect[]; // resident SpEffect stat boosts
}

export interface TalismanRecord extends CoreItemFields {
  readonly id: number;
  readonly name: string;
  readonly weight: number;
  readonly conflicts: readonly string[]; // names of talismans in the same accessoryGroup
  readonly effects: readonly ItemEffect[]; // SpEffect referenced by refId
}

export interface AshOfWarRecord extends CoreItemFields {
  readonly id: number;
  readonly name: string;
  readonly armamentCategories: readonly string[]; // weapon types it can mount on
  readonly defaultAffinity: string;
  readonly possibleAffinities: readonly string[];
  readonly skillId: number; // swordArtsParamId
}

export interface SpellRecord extends CoreItemFields {
  readonly id: number;
  readonly name: string;
  readonly category: string; // 'Sorcery' | 'Incantation'
  readonly fpCost: number;
  readonly fpCostExtra: number; // charged-cast extra
  readonly spCost: number;
  readonly slotsUsed: number;
  readonly reqIntelligence: number;
  readonly reqFaith: number;
  readonly reqArcane: number;
  readonly isWeaponBuff: boolean;
}

export interface SpiritAshRecord extends CoreItemFields {
  readonly id: number;
  readonly name: string;
  readonly summonName: string;
  readonly fpCost: number;
  readonly hpCost: number;
  readonly upgradeMaterial: string; // 'Grave Glovewort' | 'Ghost Glovewort' | ''
  readonly upgradeCosts: readonly number[];
}

export interface GoodRecord extends CoreItemFields {
  readonly id: number;
  readonly name: string;
  readonly category: string; // EquipParamGoods.goodsType (gestures via sortGroupId)
  readonly weight: number;
  readonly maxHeld: number;
}

// --- Attack-rating (AR) scaling model ---------------------------------------
// The data needed to compute a weapon's Attack Rating at any stats/upgrade level,
// faithfully ported from ThomasJClark's elden-ring-weapon-calculator encoding (the
// community-canonical model). The runtime AR formula that consumes these lives in
// `@elden-ring-compass/data` (`ar.ts`); here we only extract the params verbatim.
//
//  - per weapon (`WeaponScalingRecord`): unupgraded base attack per damage type,
//    unupgraded scaling per attribute (correctX/100), and the ids linking the three
//    shared tables below.
//  - `ReinforceTypeRecord`: per-`+N` multipliers for base attack + scaling.
//  - `AttackElementCorrectRecord`: which attributes correct which damage type.
//  - `CalcCorrectGraphRecord`: the stat→growth saturation ("soft-cap") curves.

export type DamageType = 'physical' | 'magic' | 'fire' | 'lightning' | 'holy';
export type ScalingAttr = 'str' | 'dex' | 'int' | 'fai' | 'arc';

export interface WeaponScalingRecord {
  readonly id: number;
  readonly reinforceTypeId: number;
  readonly attackElementCorrectId: number;
  // Attribute requirements (nonzero only) — duplicated here so the AR calc is
  // self-contained; an unmet requirement applies the −40% ineffective penalty.
  readonly requirements: Readonly<Partial<Record<ScalingAttr, number>>>;
  // Unupgraded base attack power per damage type (nonzero entries only).
  readonly baseAttack: Readonly<Partial<Record<DamageType, number>>>;
  // Unupgraded scaling per attribute = correctX / 100 (nonzero entries only).
  readonly scaling: Readonly<Partial<Record<ScalingAttr, number>>>;
  // CalcCorrectGraph id per damage type; omitted where it's the default (0).
  readonly calcCorrectIds: Readonly<Partial<Record<DamageType, number>>>;
}

export interface ReinforceLevel {
  // Multipliers in DamageType order [physical, magic, fire, lightning, holy].
  readonly attack: readonly number[];
  // Multipliers in ScalingAttr order [str, dex, int, fai, arc].
  readonly scaling: readonly number[];
}
export interface ReinforceTypeRecord {
  readonly id: number; // reinforceTypeId; `levels[n]` is the weapon at +n
  readonly levels: readonly ReinforceLevel[];
}

export interface AttackElementCorrectRecord {
  readonly id: number;
  // damageType → attribute → `true` (use weapon scaling) | number (override rate).
  readonly correct: Readonly<
    Partial<Record<DamageType, Readonly<Partial<Record<ScalingAttr, number | true>>>>>
  >;
}

export interface CalcCorrectStage {
  readonly maxVal: number; // stat value at this stage boundary
  readonly maxGrowVal: number; // growth (0..~1.1) at the boundary (stageMaxGrowVal/100)
  readonly adjPt: number; // segment exponent (adjPt_maxGrowVal)
}
export interface CalcCorrectGraphRecord {
  readonly id: number;
  readonly stages: readonly CalcCorrectStage[]; // 5 stages
}

export interface ItemTables {
  readonly weapons: WeaponRecord[];
  readonly armor: ArmorRecord[];
  readonly talismans: TalismanRecord[];
  readonly goods: GoodRecord[];
  readonly ashesOfWar: AshOfWarRecord[];
  readonly spells: SpellRecord[];
  readonly spiritAshes: SpiritAshRecord[];
  // AR scaling model (above).
  readonly weaponScaling: WeaponScalingRecord[];
  readonly reinforceTypes: ReinforceTypeRecord[];
  readonly attackElementCorrects: AttackElementCorrectRecord[];
  readonly calcCorrectGraphs: CalcCorrectGraphRecord[];
}

// EquipParamGoods.goodsType → display category. Derived empirically by grouping
// the named rows (the enum isn't in the vendored Paramdex Defs). Sorceries and
// incantations each span two types (offensive + utility); spirit ashes span two.
const GOODS_CATEGORY: Record<number, string> = {
  0: 'Consumable',
  1: 'Key Item',
  2: 'Crafting Material',
  3: 'Remembrance',
  5: 'Sorcery',
  7: 'Spirit Ash',
  8: 'Spirit Ash',
  9: 'Wondrous Physick',
  10: 'Crystal Tear',
  11: 'Crafting Tool',
  12: 'Info Item',
  14: 'Upgrade Material',
  15: 'Great Rune',
  16: 'Incantation',
  17: 'Sorcery',
  18: 'Incantation',
};

// EquipParamWeapon.wepType → display category (ported from erdb
// `typing/categories.py` _ARMAMENT_CATEGORY_IDS + AmmoCategory). Ammo (arrows/
// bolts) share the param with armaments; the category is what tells them apart,
// so the web can populate its separate "ammo" vs "armaments" tabs from one dataset.
// EquipParamProtector.protectorCategory (PROTECTOR_CATEGORY enum).
const ARMOR_CATEGORY: Record<number, string> = {
  0: 'Head',
  1: 'Body',
  2: 'Arms',
  3: 'Legs',
};

const WEAPON_CATEGORY: Record<number, string> = {
  1: 'Dagger',
  3: 'Straight Sword',
  5: 'Greatsword',
  7: 'Colossal Sword',
  9: 'Curved Sword',
  11: 'Curved Greatsword',
  13: 'Katana',
  14: 'Twinblade',
  15: 'Thrusting Sword',
  16: 'Heavy Thrusting Sword',
  17: 'Axe',
  19: 'Greataxe',
  21: 'Hammer',
  23: 'Great Hammer',
  24: 'Flail',
  25: 'Spear',
  28: 'Great Spear',
  29: 'Halberd',
  31: 'Reaper',
  35: 'Fist',
  37: 'Claw',
  39: 'Whip',
  41: 'Colossal Weapon',
  50: 'Light Bow',
  51: 'Bow',
  53: 'Greatbow',
  55: 'Crossbow',
  56: 'Ballista',
  57: 'Glintstone Staff',
  61: 'Sacred Seal',
  65: 'Small Shield',
  67: 'Medium Shield',
  69: 'Greatshield',
  87: 'Torch',
  // Ammo
  81: 'Arrow',
  83: 'Greatarrow',
  85: 'Bolt',
  86: 'Greatbolt',
};

// EquipParamGoods.sortGroupId for gestures (erdb GoodsSortGroupID.GESTURES). They
// are goods rows, so they'd otherwise hide under a goodsType-derived category.
const GESTURE_SORT_GROUP = 250;

// wepType values that are ammo (arrows/bolts) — they don't reinforce, so weapon
// upgrade-material detection must skip them.
const AMMO_WEP_TYPES = new Set([81, 83, 85, 86]);

// AR scaling field maps (EquipParamWeapon / ReinforceParamWeapon /
// AttackElementCorrectParam). DamageType → [base-attack field, correctType field];
// note ER's `*Thunder`=Lightning and `*Dark`=Holy holdovers. The default
// CalcCorrectGraph for damage is id 0 (status is id 6 — deferred).
const DEFAULT_DAMAGE_CALC_CORRECT_GRAPH_ID = 0;
const DAMAGE_FIELDS: readonly [DamageType, string, string][] = [
  ['physical', 'attackBasePhysics', 'correctType_Physics'],
  ['magic', 'attackBaseMagic', 'correctType_Magic'],
  ['fire', 'attackBaseFire', 'correctType_Fire'],
  ['lightning', 'attackBaseThunder', 'correctType_Thunder'],
  ['holy', 'attackBaseDark', 'correctType_Dark'],
];
// ScalingAttr → [EquipParamWeapon correctX field, ReinforceParamWeapon rate field,
// AttackElementCorrectParam name part]. ER stores dex as "Agility", int as "Magic",
// arc as "Luck".
const SCALING_FIELDS: readonly [ScalingAttr, string, string, string][] = [
  ['str', 'correctStrength', 'correctStrengthRate', 'Strength'],
  ['dex', 'correctAgility', 'correctAgilityRate', 'Dexterity'],
  ['int', 'correctMagic', 'correctMagicRate', 'Magic'],
  ['fai', 'correctFaith', 'correctFaithRate', 'Faith'],
  ['arc', 'correctLuck', 'correctLuckRate', 'Luck'],
];
// AttackElementCorrectParam damage-type suffixes (`is<Attr>Correct_by<Suffix>`).
const AEC_DT_SUFFIX: readonly [DamageType, string][] = [
  ['physical', 'Physics'],
  ['magic', 'Magic'],
  ['fire', 'Fire'],
  ['lightning', 'Thunder'],
  ['holy', 'Dark'],
];
// ReinforceParamWeapon base-attack rate fields, in DamageType order.
const REINFORCE_ATTACK_RATES: readonly string[] = [
  'physicsAtkRate',
  'magicAtkRate',
  'fireAtkRate',
  'thunderAtkRate',
  'darkAtkRate',
];

/**
 * Consecutive ids from `base` (e.g. an upgrade chain), up to the largest maxima
 * whose endpoint still exists (erdb `find_offset_indices`). Used for reinforcement
 * chains (weapons 0/10/25 levels, spirit ashes 0..9).
 */
const findOffsetIndices = (
  base: number,
  has: (id: number) => boolean,
  maxima: readonly number[],
  inc = 1,
): number[] => {
  const max =
    [...maxima].toSorted((a, b) => b - a).find((m) => has(base + m * inc)) ?? 0;
  const out: number[] = [];
  for (let i = 0; i <= max; i++)
    if (has(base + i * inc)) out.push(base + i * inc);
  return out;
};

// Affinity index → name (erdb Affinity.id). `defaultWepAttr` is an index into this;
// `configurableWepAttrNN` bits flag which are selectable for an Ash of War.
const AFFINITIES = [
  'Standard',
  'Heavy',
  'Keen',
  'Quality',
  'Fire',
  'Flame Art',
  'Lightning',
  'Sacred',
  'Magic',
  'Cold',
  'Poison',
  'Blood',
  'Occult',
] as const;

// EquipParamGem `canMountWep_<suffix>` flag suffix → armament display category
// (ported from erdb `_ARMAMENT_CATEGORY_INGAME`; note the game's odd casing —
// `katana`, `ClossBow`). Drives an Ash of War's compatible-armament list.
const GEM_MOUNT_CATEGORIES: readonly [string, string][] = [
  ['Dagger', 'Dagger'],
  ['SwordNormal', 'Straight Sword'],
  ['SwordLarge', 'Greatsword'],
  ['SwordGigantic', 'Colossal Sword'],
  ['SaberNormal', 'Curved Sword'],
  ['SaberLarge', 'Curved Greatsword'],
  ['katana', 'Katana'],
  ['SwordDoubleEdge', 'Twinblade'],
  ['SwordPierce', 'Thrusting Sword'],
  ['RapierHeavy', 'Heavy Thrusting Sword'],
  ['AxeNormal', 'Axe'],
  ['AxeLarge', 'Greataxe'],
  ['HammerNormal', 'Hammer'],
  ['HammerLarge', 'Great Hammer'],
  ['Flail', 'Flail'],
  ['SpearNormal', 'Spear'],
  ['SpearHeavy', 'Great Spear'],
  ['SpearAxe', 'Halberd'],
  ['Sickle', 'Reaper'],
  ['Knuckle', 'Fist'],
  ['Claw', 'Claw'],
  ['Whip', 'Whip'],
  ['AxhammerLarge', 'Colossal Weapon'],
  ['BowSmall', 'Light Bow'],
  ['BowNormal', 'Bow'],
  ['BowLarge', 'Greatbow'],
  ['ClossBow', 'Crossbow'],
  ['Ballista', 'Ballista'],
  ['Staff', 'Glintstone Staff'],
  ['Talisman', 'Sacred Seal'],
  ['ShieldSmall', 'Small Shield'],
  ['ShieldNormal', 'Medium Shield'],
  ['ShieldLarge', 'Greatshield'],
  ['Torch', 'Torch'],
];

type Row = Map<string, RowValue>;
const num = (row: Row, key: string): number => {
  const v = row.get(key);
  return typeof v === 'number' ? v : 0;
};

// ER rarity int → label (erdb GoodsRarity.from_id): 0/1 Common, 2 Rare, 3 Legendary.
const rarityLabel = (r: number): string =>
  r >= 3 ? 'Legendary' : r === 2 ? 'Rare' : 'Common';

const splitDescription = (text?: string): string[] =>
  text && text.length > 0 ? text.split('\n') : [];

/**
 * Fields every item category shares, sourced identically: summary/description
 * from the per-category Info/Caption FMG (passed in), rarity/icon/sellValue from
 * the decoded param row. `iconField` is `iconIdM` for armor, `iconId` otherwise.
 */
const coreFields = (
  f: Row,
  id: number,
  info: ReadonlyMap<number, string> | undefined,
  caption: ReadonlyMap<number, string> | undefined,
  iconField = 'iconId',
): CoreItemFields => ({
  summary: info?.get(id) ?? '',
  description: splitDescription(caption?.get(id)),
  rarity: rarityLabel(num(f, 'rarity')),
  icon: num(f, iconField),
  sellValue: num(f, 'sellValue'),
});

/**
 * Decode one equipment category: every named row of `nameTable` whose id has a
 * PARAM row gets its fields decoded and mapped to a record via `build`. Warns on
 * paramdef-vs-regulation dataVersion drift (a patch outran our vendored Paramdex).
 */
const decodeCategory = <T>(
  paramFiles: Map<string, Uint8Array>,
  paramName: string,
  nameTable: Map<number, string>,
  build: (id: number, name: string, row: Row) => T,
): Effect.Effect<
  T[],
  ParamError | ParamdefError,
  FileSystem.FileSystem | Path.Path
> =>
  Effect.gen(function* () {
    const bytes = paramFiles.get(paramName);
    if (!bytes) {
      yield* Effect.logWarning(`no ${paramName} param; skipping`);
      return [];
    }
    const param = yield* parseParam(bytes);
    const def = yield* loadParamdef(paramName);
    if (def.dataVersion !== param.dataVersion) {
      yield* Effect.logWarning(
        `paramdef drift: ${paramName} def v${def.dataVersion} vs regulation v${param.dataVersion}` +
          ` — decoded stats may be wrong; refresh Paramdex (bun run update-paramdex)`,
      );
    }
    const rowsById = new Map(param.rows.map((r) => [r.id, r]));
    const out: T[] = [];
    for (const [id, name] of nameTable) {
      const row = rowsById.get(id);
      if (!row || name.trim().length === 0 || name === '[ERROR]') continue;
      out.push(
        build(id, name, decodeRow(bytes, row.dataOffset, def, param.little)),
      );
    }
    return out;
  });

/** Decode every row of a param into an id → fields map (for cross-param joins). */
const decodeParamMap = (
  paramFiles: Map<string, Uint8Array>,
  paramName: string,
): Effect.Effect<
  Map<number, Row>,
  ParamError | ParamdefError,
  FileSystem.FileSystem | Path.Path
> =>
  Effect.gen(function* () {
    const bytes = paramFiles.get(paramName);
    if (!bytes) {
      yield* Effect.logWarning(`no ${paramName} param; skipping`);
      return new Map();
    }
    const param = yield* parseParam(bytes);
    const def = yield* loadParamdef(paramName);
    const out = new Map<number, Row>();
    for (const r of param.rows)
      out.set(r.id, decodeRow(bytes, r.dataOffset, def, param.little));
    return out;
  });

export const join = (
  paramFiles: Map<string, Uint8Array>,
  names: ItemText,
): Effect.Effect<
  ItemTables,
  ParamError | ParamdefError,
  FileSystem.FileSystem | Path.Path
> =>
  Effect.gen(function* () {
    // Lazy SpEffect resolver: decode a referenced SpEffectParam row on demand → its
    // effects[]. Shared by armor (residentSpEffectId*) and talismans (refId).
    let resolveEffects: (id: number) => ItemEffect[] = () => [];
    const spBytes = paramFiles.get('SpEffectParam');
    if (spBytes) {
      const sp = yield* parseParam(spBytes);
      const spDef = yield* loadParamdef('SpEffectParam'); // → SpEffect.xml (aliased)
      const spOffsets = new Map(sp.rows.map((r) => [r.id, r.dataOffset]));
      const spCache = new Map<number, ItemEffect[]>();
      resolveEffects = (id) => {
        if (id < 0) return [];
        const hit = spCache.get(id);
        if (hit) return hit;
        const off = spOffsets.get(id);
        const eff =
          off === undefined
            ? []
            : effectsFromSpEffectRow(decodeRow(spBytes, off, spDef, sp.little));
        spCache.set(id, eff);
        return eff;
      };
    } else {
      yield* Effect.logWarning('no SpEffectParam; item effects will be empty');
    }

    // Reinforcement chains: a weapon's reinforceTypeId is the base ReinforceParamWeapon
    // row; the chain length (10 vs 25) tells Somber vs regular Smithing Stone.
    const reinforceRows = yield* decodeParamMap(
      paramFiles,
      'ReinforceParamWeapon',
    );
    const weaponUpgrade = (
      f: Row,
    ): { upgradeMaterial: string; upgradeCosts: number[] } => {
      if (AMMO_WEP_TYPES.has(num(f, 'wepType')))
        return { upgradeMaterial: '', upgradeCosts: [] };
      const chain = findOffsetIndices(
        num(f, 'reinforceTypeId'),
        (i) => reinforceRows.has(i),
        [0, 10, 25],
      );
      const levels = chain.length - 1;
      const upgradeMaterial =
        levels >= 25
          ? 'Smithing Stone'
          : levels >= 10
            ? 'Somber Smithing Stone'
            : '';
      const basePrice = num(f, 'reinforcePrice');
      const upgradeCosts = chain.slice(1).map((i) => {
        const rr = reinforceRows.get(i);
        return rr ? Math.round(basePrice * num(rr, 'reinforcePriceRate')) : 0;
      });
      return { upgradeMaterial, upgradeCosts };
    };

    const weapons = yield* decodeCategory(
      paramFiles,
      'EquipParamWeapon',
      names.WeaponName,
      (id, name, f) => ({
        id,
        name,
        category: WEAPON_CATEGORY[num(f, 'wepType')] ?? 'Other',
        allowAshOfWar: num(f, 'gemMountType') === 2, // GEM_MOUNT_TYPE.ALLOW_CHANGE
        isBuffable: num(f, 'isEnhance') === 1,
        ...coreFields(f, id, undefined, names.WeaponCaption), // no WeaponInfo summary
        weight: num(f, 'weight'),
        attackPhysical: num(f, 'attackBasePhysics'),
        reqStrength: num(f, 'properStrength'),
        reqDexterity: num(f, 'properAgility'),
        reqIntelligence: num(f, 'properMagic'),
        reqFaith: num(f, 'properFaith'),
        reqArcane: num(f, 'properLuck'),
        ...weaponUpgrade(f),
        effects: [
          ...weaponBaseEffects(f),
          ...aggregateEffects([
            ...resolveEffects(num(f, 'residentSpEffectId')),
            ...resolveEffects(num(f, 'residentSpEffectId1')),
            ...resolveEffects(num(f, 'residentSpEffectId2')),
          ]),
          ...aggregateEffects(
            withCondition(
              [
                ...resolveEffects(num(f, 'spEffectBehaviorId0')),
                ...resolveEffects(num(f, 'spEffectBehaviorId1')),
                ...resolveEffects(num(f, 'spEffectBehaviorId2')),
              ],
              'On Hit',
            ),
          ),
        ],
      }),
    );

    // --- AR scaling model -------------------------------------------------
    // Per-weapon scaling refs + the shared reinforce/element-correct/calc-correct
    // tables the AR formula needs. We emit only the table rows weapons reference.
    const usedReinforce = new Set<number>();
    const usedAec = new Set<number>();
    const usedGraphs = new Set<number>([DEFAULT_DAMAGE_CALC_CORRECT_GRAPH_ID]);

    const buildScaling = (
      id: number,
      _name: string,
      f: Row,
    ): WeaponScalingRecord | null => {
      // Ammo and weapons without a reinforce chain (e.g. unarmed) have no AR model.
      if (AMMO_WEP_TYPES.has(num(f, 'wepType'))) return null;
      const reinforceTypeId = num(f, 'reinforceTypeId');
      if (!reinforceRows.has(reinforceTypeId)) return null;

      const baseAttack: Partial<Record<DamageType, number>> = {};
      const calcCorrectIds: Partial<Record<DamageType, number>> = {};
      for (const [dt, atkField, ctField] of DAMAGE_FIELDS) {
        const base = num(f, atkField);
        if (!base) continue;
        baseAttack[dt] = base;
        const graphId = num(f, ctField);
        usedGraphs.add(graphId);
        if (graphId !== DEFAULT_DAMAGE_CALC_CORRECT_GRAPH_ID)
          calcCorrectIds[dt] = graphId;
      }
      // No damage = not an armament we can rate (e.g. some shields/torches).
      if (Object.keys(baseAttack).length === 0) return null;

      const scaling: Partial<Record<ScalingAttr, number>> = {};
      for (const [attr, correctField] of SCALING_FIELDS) {
        const v = num(f, correctField);
        if (v) scaling[attr] = v / 100;
      }

      const requirements: Partial<Record<ScalingAttr, number>> = {};
      const reqFields: readonly [ScalingAttr, string][] = [
        ['str', 'properStrength'],
        ['dex', 'properAgility'],
        ['int', 'properMagic'],
        ['fai', 'properFaith'],
        ['arc', 'properLuck'],
      ];
      for (const [attr, field] of reqFields) {
        const v = num(f, field);
        if (v) requirements[attr] = v;
      }

      const attackElementCorrectId = num(f, 'attackElementCorrectId');
      usedReinforce.add(reinforceTypeId);
      usedAec.add(attackElementCorrectId);
      return {
        id,
        reinforceTypeId,
        attackElementCorrectId,
        requirements,
        baseAttack,
        scaling,
        calcCorrectIds,
      };
    };

    const weaponScaling = (
      yield* decodeCategory(
        paramFiles,
        'EquipParamWeapon',
        names.WeaponName,
        buildScaling,
      )
    ).filter((x): x is WeaponScalingRecord => x !== null);

    // Reinforce types: rows reinforceTypeId+0 .. +N (consecutive) → per-level rates.
    const reinforceTypes: ReinforceTypeRecord[] = [...usedReinforce]
      .toSorted((a, b) => a - b)
      .map((baseId) => {
        const levels: ReinforceLevel[] = [];
        for (let lvl = 0; reinforceRows.has(baseId + lvl); lvl++) {
          const rr = reinforceRows.get(baseId + lvl);
          if (!rr) break;
          levels.push({
            attack: REINFORCE_ATTACK_RATES.map((k) => num(rr, k)),
            scaling: SCALING_FIELDS.map(([, , rateField]) => num(rr, rateField)),
          });
        }
        return { id: baseId, levels };
      });

    // AttackElementCorrectParam: which attributes correct which damage type.
    const aecRows = yield* decodeParamMap(
      paramFiles,
      'AttackElementCorrectParam',
    );
    const attackElementCorrects: AttackElementCorrectRecord[] = [...usedAec]
      .toSorted((a, b) => a - b)
      .map((id) => {
        const row = aecRows.get(id);
        const correct: {
          -readonly [K in DamageType]?: Partial<Record<ScalingAttr, number | true>>;
        } = {};
        if (row) {
          for (const [dt, suffix] of AEC_DT_SUFFIX) {
            const entry: Partial<Record<ScalingAttr, number | true>> = {};
            for (const [attr, , , namePart] of SCALING_FIELDS) {
              if (num(row, `is${namePart}Correct_by${suffix}`) !== 1) continue;
              const overwrite = num(row, `overwrite${namePart}CorrectRate_by${suffix}`);
              entry[attr] = overwrite === -1 ? true : overwrite / 100;
            }
            if (Object.keys(entry).length > 0) correct[dt] = entry;
          }
        }
        return { id, correct };
      });

    // CalcCorrectGraph: the stat→growth saturation curves (5 stages each).
    const calcCorrectRows = yield* decodeParamMap(paramFiles, 'CalcCorrectGraph');
    const calcCorrectGraphs: CalcCorrectGraphRecord[] = [...usedGraphs]
      .toSorted((a, b) => a - b)
      .flatMap((id) => {
        const row = calcCorrectRows.get(id);
        if (!row) return [];
        const stages: CalcCorrectStage[] = [0, 1, 2, 3, 4].map((i) => ({
          maxVal: num(row, `stageMaxVal${i}`),
          maxGrowVal: num(row, `stageMaxGrowVal${i}`) / 100,
          adjPt: num(row, `adjPt_maxGrowVal${i}`),
        }));
        return [{ id, stages }];
      });

    // Negation % = (1 - cutRate) * 100, rounded to 1 dp (the game's display).
    const neg = (f: Row, key: string) =>
      Math.round((1 - num(f, key)) * 1000) / 10;
    const armor = yield* decodeCategory(
      paramFiles,
      'EquipParamProtector',
      names.ProtectorName,
      (id, name, f) => ({
        id,
        name,
        category: ARMOR_CATEGORY[num(f, 'protectorCategory')] ?? 'Body',
        ...coreFields(
          f,
          id,
          names.ProtectorInfo,
          names.ProtectorCaption,
          'iconIdM',
        ),
        weight: num(f, 'weight'),
        negationPhysical: neg(f, 'neutralDamageCutRate'),
        negationStrike: neg(f, 'blowDamageCutRate'),
        negationSlash: neg(f, 'slashDamageCutRate'),
        negationPierce: neg(f, 'thrustDamageCutRate'),
        negationMagic: neg(f, 'magicDamageCutRate'),
        negationFire: neg(f, 'fireDamageCutRate'),
        negationLightning: neg(f, 'thunderDamageCutRate'),
        negationHoly: neg(f, 'darkDamageCutRate'), // ER renamed Dark → Holy
        resistPoison: num(f, 'resistPoison'),
        resistScarletRot: num(f, 'resistDisease'),
        resistBleed: num(f, 'resistBlood'),
        resistFrost: num(f, 'resistFreeze'),
        resistSleep: num(f, 'resistSleep'),
        resistMadness: num(f, 'resistMadness'),
        resistDeath: num(f, 'resistCurse'),
        poise: Math.round(num(f, 'toughnessCorrectRate') * 1000), // displayed poise
        effects: aggregateEffects([
          ...resolveEffects(num(f, 'residentSpEffectId')),
          ...resolveEffects(num(f, 'residentSpEffectId2')),
          ...resolveEffects(num(f, 'residentSpEffectId3')),
        ]),
      }),
    );

    const talismansRaw = yield* decodeCategory(
      paramFiles,
      'EquipParamAccessory',
      names.AccessoryName,
      (id, name, f) => ({
        id,
        name,
        ...coreFields(f, id, names.AccessoryInfo, names.AccessoryCaption),
        weight: num(f, 'weight'),
        effects: aggregateEffects(resolveEffects(num(f, 'refId'))),
        accessoryGroup: num(f, 'accessoryGroup'), // -1 = no conflict group
      }),
    );
    // Talismans sharing an accessoryGroup can't be equipped together (e.g. a
    // talisman and its +1/+2 upgrades). Conflicts = the other names in the group.
    const talismanGroups = new Map<number, string[]>();
    for (const t of talismansRaw) {
      if (t.accessoryGroup < 0) continue;
      const arr = talismanGroups.get(t.accessoryGroup) ?? [];
      arr.push(t.name);
      talismanGroups.set(t.accessoryGroup, arr);
    }
    const talismans: TalismanRecord[] = talismansRaw.map(
      ({ accessoryGroup, ...t }) => ({
        ...t,
        conflicts: (talismanGroups.get(accessoryGroup) ?? []).filter(
          (n) => n !== t.name,
        ),
      }),
    );

    const goods = yield* decodeCategory(
      paramFiles,
      'EquipParamGoods',
      names.GoodsName,
      (id, name, f) => ({
        id,
        name,
        category:
          num(f, 'sortGroupId') === GESTURE_SORT_GROUP
            ? 'Gesture'
            : (GOODS_CATEGORY[num(f, 'goodsType')] ?? 'Other'),
        ...coreFields(f, id, names.GoodsInfo, names.GoodsCaption),
        weight: num(f, 'weight'),
        maxHeld: num(f, 'maxNum'),
      }),
    );

    // Ashes of War (EquipParamGem). Promoted from a name-only table to decoded:
    // which armaments it mounts on, its affinities, and the skill it grants.
    const ashesOfWarAll = yield* decodeCategory(
      paramFiles,
      'EquipParamGem',
      names.GemName,
      (id, name, f): AshOfWarRecord => ({
        id,
        name,
        ...coreFields(f, id, names.GemInfo, names.GemCaption),
        armamentCategories: GEM_MOUNT_CATEGORIES.filter(
          ([suffix]) => num(f, `canMountWep_${suffix}`) === 1,
        ).map(([, display]) => display),
        defaultAffinity: AFFINITIES[num(f, 'defaultWepAttr')] ?? 'Standard',
        possibleAffinities: AFFINITIES.filter(
          (_, i) =>
            num(f, `configurableWepAttr${String(i).padStart(2, '0')}`) === 1,
        ),
        skillId: num(f, 'swordArtsParamId'),
      }),
    );
    // erdb filters EquipParamGem to id ≥ 10000 (below are test/placeholder gems).
    const ashesOfWar = ashesOfWarAll.filter((a) => a.id >= 10000);

    // Spells: EquipParamGoods sorcery/incantation rows ⨝ the Magic param for stats.
    const SPELL_GOODS_TYPES = new Set([5, 16, 17, 18]); // sorcery×2, incantation×2
    const goodsRows = yield* decodeParamMap(paramFiles, 'EquipParamGoods');
    const magicRows = yield* decodeParamMap(paramFiles, 'Magic');
    const mtrlRows = yield* decodeParamMap(paramFiles, 'EquipMtrlSetParam');
    const spells: SpellRecord[] = [];
    for (const [id, name] of names.GoodsName) {
      if (name.trim().length === 0 || name === '[ERROR]') continue;
      const g = goodsRows.get(id);
      const m = magicRows.get(id);
      if (!g || !m || !SPELL_GOODS_TYPES.has(num(g, 'goodsType'))) continue;
      spells.push({
        id,
        name,
        ...coreFields(g, id, names.GoodsInfo, names.GoodsCaption),
        category: GOODS_CATEGORY[num(g, 'goodsType')] ?? 'Sorcery',
        fpCost: num(m, 'mp'),
        fpCostExtra: num(m, 'mp_charge'),
        spCost: num(m, 'stamina'),
        slotsUsed: num(m, 'slotLength'),
        reqIntelligence: num(m, 'requirementIntellect'),
        reqFaith: num(m, 'requirementFaith'),
        reqArcane: num(m, 'requirementLuck'),
        isWeaponBuff: num(m, 'isEnchant') === 1,
      });
    }

    // Spirit ashes: base (id % 100 == 0) EquipParamGoods of the summon goodsTypes.
    // Upgrade material via EquipMtrlSetParam → glovewort name; costs from the +0..+9
    // reinforcePrice chain; summon name from GoodsInfo2.
    const SPIRIT_GOODS_TYPES = new Set([7, 8]); // lesser / greater
    const spiritAshes: SpiritAshRecord[] = [];
    for (const [id, name] of names.GoodsName) {
      if (name.trim().length === 0 || name === '[ERROR]') continue;
      if (id % 100 !== 0) continue; // base item only (upgrades are +1..+10)
      const g = goodsRows.get(id);
      if (!g || !SPIRIT_GOODS_TYPES.has(num(g, 'goodsType'))) continue;
      const mtrl = mtrlRows.get(num(g, 'reinforceMaterialId'));
      const upgradeMaterial = mtrl
        ? (names.GoodsName.get(num(mtrl, 'materialId01')) ?? '')
            .replace(/\s*\[\d+\]\s*$/, '')
            .trim()
        : '';
      const hp = num(g, 'consumeHP');
      const chain = findOffsetIndices(id, (i) => goodsRows.has(i), [9]);
      spiritAshes.push({
        id,
        name,
        ...coreFields(g, id, names.GoodsInfo, names.GoodsCaption),
        summonName: (names.GoodsInfo2.get(id) ?? '').trim(),
        fpCost: num(g, 'consumeMP'),
        hpCost: hp < 0 ? 0 : hp,
        upgradeMaterial,
        upgradeCosts: chain.slice(1).flatMap((i) => {
          const row = goodsRows.get(i);
          return row === undefined ? [] : [num(row, 'reinforcePrice')];
        }),
      });
    }

    yield* Effect.logInfo(
      `joined ${weapons.length} weapons + ${armor.length} armor + ` +
        `${talismans.length} talismans + ${goods.length} goods + ` +
        `${ashesOfWar.length} ashes of war + ${spells.length} spells + ` +
        `${spiritAshes.length} spirit ashes (stats decoded)`,
    );
    const byCat = new Map<string, number>();
    for (const g of goods)
      byCat.set(g.category, (byCat.get(g.category) ?? 0) + 1);
    yield* Effect.logInfo(
      `goods categories: ${[...byCat.entries()]
        .toSorted((a, b) => b[1] - a[1])
        .map(([c, n]) => `${c}=${n}`)
        .join(' ')}`,
    );
    return {
      weapons,
      armor,
      talismans,
      goods,
      ashesOfWar,
      spells,
      spiritAshes,
      weaponScaling,
      reinforceTypes,
      attackElementCorrects,
      calcCorrectGraphs,
    };
  });
