import type { RowValue } from '../formats/param.ts';

/**
 * SpEffectParam → item `effects[]` resolution, ported from erdb's `effect_parser`
 * (`attribute_fields.py` + `parsers.py` + `SchemaEffect.from_attribute_field`).
 *
 * An item references one or more SpEffectParam rows (talismans via `refId`, armor
 * via `residentSpEffectId{,2,3}`, weapons via resident/behavior ids). Each row has
 * ~70 stat fields; the ones whose value differs from the field's default become an
 * effect. This is the **flat** resolver — it reads the directly-referenced row's
 * attribute fields. erdb additionally walks nested refs (`cycleOccurrenceSpEffectId`
 * …), parses activation `conditions`, tick intervals, PvP values, and aggregates
 * multi-attribute effects (e.g. the 4 physical absorptions → "Physical Absorption").
 * Those are a deliberate fast-follow; the directly-set fields cover the common
 * talisman/armor stat boosts the inventory table shows.
 */

export type EffectModel = 'additive' | 'multiplicative';
export type EffectType = 'positive' | 'negative' | 'neutral';

export interface ItemEffect {
  readonly attribute: string;
  readonly value: number;
  readonly model: EffectModel;
  readonly type: EffectType;
}

type Parser = (value: number, model: EffectModel) => number;

// round(v, 6) then floor to 2 dp — avoids f32 noise like 1.8999999 flooring to 1.89.
const floorDec2 = (v: number): number =>
  Math.floor((Math.round(v * 1e6) / 1e6) * 100) / 100;

// --- parsers (erdb parsers.py) ---
const generic: Parser = (v) => v;
// Some fields store subtractable/divisible values as negatives; reverse them.
const genericInverse: Parser = (v, model) =>
  model === 'additive' ? -v : floorDec2(2 - v);
// Flat inverse percentage: -10 → 1.1 (e.g. Assassin's Crimson Dagger).
const genericInversePercentage: Parser = (v) => 1 + -v / 100;
// Poise is stored as a damage-absorption ratio; the shown increase is its inverse.
const poise: Parser = (v) => Math.floor((1 / v) * 100) / 100;
const itemDiscovery: Parser = (v) => v * 100;

interface AttributeField {
  readonly attribute: string;
  readonly model: EffectModel;
  readonly type: EffectType;
  readonly parser: Parser;
  readonly defaultValue: number;
}

const mk = (
  attribute: string,
  model: EffectModel,
  type: EffectType,
  parser: Parser,
  defaultValue?: number,
): AttributeField => ({
  attribute,
  model,
  type,
  parser,
  defaultValue: defaultValue ?? (model === 'multiplicative' ? 1 : 0),
});

// SpEffectParam field → effect descriptor (erdb `_ATTRIBUTE_FIELDS`). Weapon-only
// conditional fields (weakA_DamageRate …) are intentionally omitted for now.
const ATTRIBUTE_FIELDS: Record<string, AttributeField> = {
  maxHpRate: mk('Maximum Health', 'multiplicative', 'positive', generic),
  changeHpPoint: mk('Health Points', 'additive', 'positive', genericInverse),
  changeHpRate: mk('Health Points', 'multiplicative', 'positive', genericInversePercentage, 0),
  changeHpEstusFlaskCorrectRate: mk('Flask Health Restoration', 'multiplicative', 'positive', generic),
  maxMpRate: mk('Maximum Focus', 'multiplicative', 'positive', generic),
  changeMpPoint: mk('Focus Points', 'additive', 'positive', genericInverse),
  changeMpRate: mk('Focus Points', 'multiplicative', 'positive', genericInversePercentage, 0),
  changeMpEstusFlaskCorrectRate: mk('Flask Focus Restoration', 'multiplicative', 'positive', generic),
  maxStaminaRate: mk('Maximum Stamina', 'multiplicative', 'positive', generic),
  staminaRecoverChangeSpeed: mk('Stamina Recovery Speed', 'additive', 'positive', generic),
  equipWeightChangeRate: mk('Maximum Equip Load', 'multiplicative', 'positive', generic),
  toughnessDamageCutRate: mk('Poise', 'multiplicative', 'positive', poise),
  addLifeForceStatus: mk('Vigor', 'additive', 'positive', generic),
  addWillpowerStatus: mk('Mind', 'additive', 'positive', generic),
  addEndureStatus: mk('Endurance', 'additive', 'positive', generic),
  addStrengthStatus: mk('Strength', 'additive', 'positive', generic),
  addDexterityStatus: mk('Dexterity', 'additive', 'positive', generic),
  addMagicStatus: mk('Intelligence', 'additive', 'positive', generic),
  addFaithStatus: mk('Faith', 'additive', 'positive', generic),
  addLuckStatus: mk('Arcane', 'additive', 'positive', generic),
  neutralDamageCutRate: mk('Standard Absorption', 'multiplicative', 'positive', genericInverse),
  blowDamageCutRate: mk('Strike Absorption', 'multiplicative', 'positive', genericInverse),
  slashDamageCutRate: mk('Slash Absorption', 'multiplicative', 'positive', genericInverse),
  thrustDamageCutRate: mk('Pierce Absorption', 'multiplicative', 'positive', genericInverse),
  defEnemyDmgCorrectRate_Physics: mk('Physical Absorption', 'multiplicative', 'positive', genericInverse),
  magicDamageCutRate: mk('Magic Absorption', 'multiplicative', 'positive', genericInverse),
  defEnemyDmgCorrectRate_Magic: mk('Magic Absorption', 'multiplicative', 'positive', genericInverse),
  fireDamageCutRate: mk('Fire Absorption', 'multiplicative', 'positive', genericInverse),
  defEnemyDmgCorrectRate_Fire: mk('Fire Absorption', 'multiplicative', 'positive', genericInverse),
  thunderDamageCutRate: mk('Lightning Absorption', 'multiplicative', 'positive', genericInverse),
  defEnemyDmgCorrectRate_Thunder: mk('Lightning Absorption', 'multiplicative', 'positive', genericInverse),
  darkDamageCutRate: mk('Holy Absorption', 'multiplicative', 'positive', genericInverse),
  defEnemyDmgCorrectRate_Dark: mk('Holy Absorption', 'multiplicative', 'positive', genericInverse),
  neutralAttackPowerRate: mk('Standard Attack Power', 'multiplicative', 'positive', generic),
  blowAttackPowerRate: mk('Strike Attack Power', 'multiplicative', 'positive', generic),
  slashAttackPowerRate: mk('Slash Attack Power', 'multiplicative', 'positive', generic),
  thrustAttackPowerRate: mk('Pierce Attack Power', 'multiplicative', 'positive', generic),
  physicsAttackPowerRate: mk('Physical Attack Power', 'multiplicative', 'positive', generic),
  physicsAttackRate: mk('Physical Attack Power', 'multiplicative', 'positive', generic),
  atkEnemyDmgCorrectRate_Physics: mk('Physical Attack Power', 'multiplicative', 'positive', generic),
  magicAttackRate: mk('Magic Attack Power', 'multiplicative', 'positive', generic),
  atkEnemyDmgCorrectRate_Magic: mk('Magic Attack Power', 'multiplicative', 'positive', generic),
  fireAttackRate: mk('Fire Attack Power', 'multiplicative', 'positive', generic),
  atkEnemyDmgCorrectRate_Fire: mk('Fire Attack Power', 'multiplicative', 'positive', generic),
  thunderAttackRate: mk('Lightning Attack Power', 'multiplicative', 'positive', generic),
  atkEnemyDmgCorrectRate_Thunder: mk('Lightning Attack Power', 'multiplicative', 'positive', generic),
  darkAttackRate: mk('Holy Attack Power', 'multiplicative', 'positive', generic),
  atkEnemyDmgCorrectRate_Dark: mk('Holy Attack Power', 'multiplicative', 'positive', generic),
  staminaAttackRate: mk('Stamina Attack Rate', 'multiplicative', 'positive', generic),
  guardStaminaCutRate: mk('Stability', 'multiplicative', 'positive', generic),
  changePoisonResistPoint: mk('Poison Resistance', 'additive', 'positive', generic),
  changeDiseaseResistPoint: mk('Scarlet Rot Resistance', 'additive', 'positive', generic),
  changeBloodResistPoint: mk('Bleed Resistance', 'additive', 'positive', generic),
  changeFreezeResistPoint: mk('Frostbite Resistance', 'additive', 'positive', generic),
  changeSleepResistPoint: mk('Sleep Resistance', 'additive', 'positive', generic),
  changeMadnessResistPoint: mk('Madness Resistance', 'additive', 'positive', generic),
  changeCurseResistPoint: mk('Death Blight Resistance', 'additive', 'positive', generic),
  changeMagicSlot: mk('Memory Slots', 'additive', 'positive', generic),
  dexterityCancelSystemOnlyAddDexterity: mk('Casting Speed', 'additive', 'positive', generic),
  extendLifeRate: mk('Spell Duration', 'multiplicative', 'positive', generic),
  magicConsumptionRate: mk('Sorcery Focus Consumption', 'multiplicative', 'negative', generic),
  miracleConsumptionRate: mk('Incantation Focus Consumption', 'multiplicative', 'negative', generic),
  shamanConsumptionRate: mk('Pyromancy Focus Consumption', 'multiplicative', 'negative', generic),
  artsConsumptionRate: mk('Skill Focus Consumption', 'multiplicative', 'negative', generic),
  bowDistRate: mk('Bow Distance', 'additive', 'positive', generic),
  hearingSearchEnemyRate: mk('Enemy Hearing', 'multiplicative', 'negative', generic),
  fallDamageRate: mk('Fall Damage', 'multiplicative', 'negative', generic),
  itemDropRate: mk('Item Discovery', 'additive', 'positive', itemDiscovery),
  soulRate: mk('Rune Acquisition', 'multiplicative', 'positive', generic),
  soul: mk('Rune Acquisition', 'additive', 'positive', generic),
};

const effectiveType = (value: number, f: AttributeField): EffectType => {
  if (f.type === 'neutral') return 'neutral';
  const increase = value >= f.defaultValue;
  if (f.type === 'positive') return increase ? 'positive' : 'negative';
  return increase ? 'negative' : 'positive'; // f.type === 'negative'
};

type Row = ReadonlyMap<string, RowValue>;

/** Effects directly set on one SpEffectParam row (fields differing from default). */
export const effectsFromSpEffectRow = (row: Row): ItemEffect[] => {
  const out: ItemEffect[] = [];
  for (const field in ATTRIBUTE_FIELDS) {
    const raw = row.get(field);
    if (typeof raw !== 'number') continue;
    const f = ATTRIBUTE_FIELDS[field]!;
    if (raw === f.defaultValue) continue;
    const value = f.parser(raw, f.model);
    out.push({
      attribute: f.attribute,
      value,
      model: f.model,
      type: effectiveType(value, f),
    });
  }
  return out;
};
