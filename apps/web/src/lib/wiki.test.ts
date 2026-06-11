import { describe, it, expect } from 'vitest';
import { wikiNameForBoss, wikiNameForItem, wikiPageUrl, WIKI_BASE_URL } from './wiki';

describe('wikiPageUrl', () => {
  it('joins words with +', () => {
    expect(wikiPageUrl('Godrick the Grafted')).toBe(`${WIKI_BASE_URL}/Godrick+the+Grafted`);
  });

  it('keeps punctuation the wiki uses verbatim', () => {
    expect(wikiPageUrl('Margit, the Fell Omen')).toBe(`${WIKI_BASE_URL}/Margit,+the+Fell+Omen`);
    expect(wikiPageUrl("Marais Executioner's Sword")).toBe(
      `${WIKI_BASE_URL}/Marais+Executioner's+Sword`,
    );
    expect(wikiPageUrl('Ash of War: Storm Stomp')).toBe(`${WIKI_BASE_URL}/Ash+of+War:+Storm+Stomp`);
  });

  it('drops the + of upgrade suffixes (the wiki page names omit it)', () => {
    expect(wikiPageUrl('Crimson Amber Medallion +1')).toBe(
      `${WIKI_BASE_URL}/Crimson+Amber+Medallion+1`,
    );
  });

  it('drops double quotes (the wiki page names omit them)', () => {
    expect(wikiPageUrl('Prattling Pate "Hello"')).toBe(`${WIKI_BASE_URL}/Prattling+Pate+Hello`);
    expect(wikiPageUrl('"Redmane" Painting')).toBe(`${WIKI_BASE_URL}/Redmane+Painting`);
  });

  it('normalizes bracketed tiers to the wiki’s parenthesized form', () => {
    expect(wikiPageUrl('Smithing Stone [4]')).toBe(`${WIKI_BASE_URL}/Smithing+Stone+(4)`);
  });

  it('normalizes typographic apostrophes', () => {
    expect(wikiPageUrl('Marais Executioner’s Sword')).toBe(
      `${WIKI_BASE_URL}/Marais+Executioner's+Sword`,
    );
  });

  it('trims and collapses whitespace', () => {
    expect(wikiPageUrl('  Rivers  of Blood ')).toBe(`${WIKI_BASE_URL}/Rivers+of+Blood`);
  });
});

describe('wikiNameForItem', () => {
  it('links affinity variants to their base weapon', () => {
    expect(wikiNameForItem({ name: 'Heavy Dagger', baseName: 'Dagger' })).toBe('Dagger');
  });

  it('strips the save-appended upgrade suffix', () => {
    expect(wikiNameForItem({ name: 'Lhutel the Headless +7', weaponUpgradeLevel: 7 })).toBe(
      'Lhutel the Headless',
    );
  });

  it('keeps catalog-level +N names (talismans have their own pages)', () => {
    expect(wikiNameForItem({ name: 'Crimson Amber Medallion +1', weaponUpgradeLevel: 0 })).toBe(
      'Crimson Amber Medallion +1',
    );
  });

  it('collapses flask upgrade tiers onto the base flask page', () => {
    expect(wikiNameForItem({ name: 'Flask of Crimson Tears +4' })).toBe('Flask of Crimson Tears');
  });

  it('retitles map fragments the way the wiki does', () => {
    expect(wikiNameForItem({ name: 'Map: Limgrave, West' })).toBe('Map (Limgrave, West)');
    // …except the DLC's, whose wiki pages keep the colon form.
    expect(wikiNameForItem({ name: 'Map: Gravesite Plain' })).toBe('Map: Gravesite Plain');
  });

  it('sends all gestures to the shared Gestures page', () => {
    expect(wikiNameForItem({ name: 'Triumphant Delight', category: 'Gesture' })).toBe('Gestures');
  });

  it('applies irregular-title overrides', () => {
    expect(wikiNameForItem({ name: 'Cleanrot Knight Finlay' })).toBe(
      'Cleanrot Knight Finlay Ashes',
    );
  });

  it('returns null for rows the wiki has no page for', () => {
    expect(wikiNameForItem({ name: 'Unarmed' })).toBeNull();
    expect(wikiNameForItem({ name: 'Erdtree Prayerbook' })).toBeNull();
  });
});

describe('wikiNameForBoss', () => {
  it('passes ordinary boss names through', () => {
    expect(wikiNameForBoss('Margit, the Fell Omen')).toBe('Margit, the Fell Omen');
  });

  it('strips weapon-variant disambiguators (no per-variant wiki pages)', () => {
    expect(wikiNameForBoss('Cleanrot Knight (Spear)')).toBe('Cleanrot Knight');
  });

  it('applies irregular-title overrides, also after stripping', () => {
    expect(wikiNameForBoss('Spiritcaller Snail')).toBe('Spirit-Caller Snail');
    expect(wikiNameForBoss('Putrid Crystalian (Spear)')).toBe('Putrid Crystalians');
  });
});
