import { Effect } from 'effect';

import {
  decodeRow,
  type ParamError,
  parseParam,
  type RowValue,
} from '../formats/param.ts';
import { loadParamdef, type ParamdefError } from '../formats/paramdef.ts';
import { effectsFromSpEffectRow, type ItemEffect } from '../game/effects.ts';
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
  readonly weight: number;
  readonly attackPhysical: number;
  readonly reqStrength: number;
  readonly reqDexterity: number;
  readonly reqIntelligence: number;
  readonly reqFaith: number;
  readonly reqArcane: number;
}

export interface ArmorRecord extends CoreItemFields {
  readonly id: number;
  readonly name: string;
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

export interface GoodRecord extends CoreItemFields {
  readonly id: number;
  readonly name: string;
  readonly category: string; // EquipParamGoods.goodsType (gestures via sortGroupId)
  readonly weight: number;
  readonly maxHeld: number;
}

export interface ItemTables {
  readonly weapons: WeaponRecord[];
  readonly armor: ArmorRecord[];
  readonly talismans: TalismanRecord[];
  readonly goods: GoodRecord[];
  readonly ashesOfWar: AshOfWarRecord[];
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
): Effect.Effect<T[], ParamError | ParamdefError> =>
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

export const join = (
  paramFiles: Map<string, Uint8Array>,
  names: ItemText,
): Effect.Effect<ItemTables, ParamError | ParamdefError> =>
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

    const weapons = yield* decodeCategory(
      paramFiles,
      'EquipParamWeapon',
      names.WeaponName,
      (id, name, f) => ({
        id,
        name,
        category: WEAPON_CATEGORY[num(f, 'wepType')] ?? 'Other',
        ...coreFields(f, id, undefined, names.WeaponCaption), // no WeaponInfo summary
        weight: num(f, 'weight'),
        attackPhysical: num(f, 'attackBasePhysics'),
        reqStrength: num(f, 'properStrength'),
        reqDexterity: num(f, 'properAgility'),
        reqIntelligence: num(f, 'properMagic'),
        reqFaith: num(f, 'properFaith'),
        reqArcane: num(f, 'properLuck'),
      }),
    );

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
        ...coreFields(f, id, names.ProtectorInfo, names.ProtectorCaption, 'iconIdM'),
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
        effects: [
          ...resolveEffects(num(f, 'residentSpEffectId')),
          ...resolveEffects(num(f, 'residentSpEffectId2')),
          ...resolveEffects(num(f, 'residentSpEffectId3')),
        ],
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
        effects: resolveEffects(num(f, 'refId')),
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

    yield* Effect.logInfo(
      `joined ${weapons.length} weapons + ${armor.length} armor + ` +
        `${talismans.length} talismans + ${goods.length} goods + ` +
        `${ashesOfWar.length} ashes of war (stats decoded)`,
    );
    const byCat = new Map<string, number>();
    for (const g of goods)
      byCat.set(g.category, (byCat.get(g.category) ?? 0) + 1);
    yield* Effect.logInfo(
      `goods categories: ${[...byCat.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([c, n]) => `${c}=${n}`)
        .join(' ')}`,
    );
    return { weapons, armor, talismans, goods, ashesOfWar };
  });
