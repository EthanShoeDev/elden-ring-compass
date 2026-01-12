/**
 * Shareable progression data structure.
 * Uses short property names to minimize compressed size.
 */
export interface ShareableProgression {
  /** Version for future compatibility */
  v: 1;
  /** Character name */
  n: string;
  /** Stats */
  s: {
    /** level */
    l: number;
    /** vigor */
    v: number;
    /** mind */
    m: number;
    /** endurance */
    e: number;
    /** strength */
    st: number;
    /** dexterity */
    d: number;
    /** intelligence */
    i: number;
    /** faith */
    f: number;
    /** arcane */
    a: number;
    /** souls (runes) */
    r: number;
    /** souls memory */
    rm: number;
  };
  /** gender (0=female, 1=male) */
  g: number;
  /** arche_type ID */
  at: number;
  /** match_making_wpn_lvl */
  wl: number;
  /** Completed event IDs (delta-encoded for compression) */
  ef: number[];
  /** Unlocked region IDs */
  ur: number[];
  /** Inventory: [ga_item_handle, quantity][] - combined equip + storage */
  inv: [number, number][];
  /** GA items: [id, reinforce_type][] for upgrade levels */
  ga: [number, number][];
}

export const SHAREABLE_VERSION = 1 as const;
