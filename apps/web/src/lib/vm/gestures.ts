import type { Slot } from '@/lib/save-dto';

// The save's 64-slot gesture table (`slot.gestures`) lists EVERY gesture the character could
// learn, not just the learned ones: an odd value is the unlocked gesture, the even value one
// below it is the same gesture still locked, and 0 / 0xFFFFFFFE / 0xFFFFFFFF pad the tail.
// Counting non-empty entries therefore counts every gesture in the game (57 on a DLC save).
//
// Table value (unlocked form) -> gesture goods id. Mapping from er-save-manager's
// `data/gestures.py` (MIT; Cheat Engine `gesture_ids` table). Its cut-content entries
// (111 The Carian Oath, 193 Fetal Position, 221 ?GoodsName?) are omitted — they have no
// catalog row. 227 (pre-order) and 233 (in-game) both grant the Ring of Miquella gesture.
const GESTURE_GOODS_ID_BY_SLOT_VALUE: ReadonlyMap<number, number> = new Map([
  [1, 9000], // Bow
  [3, 9001], // Polite Bow
  [5, 9002], // My Thanks
  [7, 9003], // Curtsy
  [9, 9004], // Reverential Bow
  [11, 9005], // My Lord
  [13, 9006], // Warm Welcome
  [15, 9007], // Wave
  [17, 9008], // Casual Greeting
  [19, 9009], // Strength!
  [21, 9010], // As You Wish
  [41, 9011], // Point Forwards
  [43, 9012], // Point Upwards
  [45, 9013], // Point Downwards
  [47, 9014], // Beckon
  [49, 9015], // Wait!
  [51, 9016], // Calm Down!
  [61, 9017], // Nod In Thought
  [81, 9018], // Extreme Repentance
  [83, 9019], // Grovel For Mercy
  [101, 9020], // Rallying Cry
  [103, 9021], // Heartening Cry
  [105, 9022], // By My Sword
  [107, 9023], // Hoslow's Oath
  [109, 9024], // Fire Spur Me
  [121, 9026], // Bravo!
  [141, 9027], // Jump for Joy
  [143, 9028], // Triumphant Delight
  [145, 9029], // Fancy Spin
  [147, 9030], // Finger Snap
  [161, 9031], // Dejection
  [181, 9032], // Patches' Crouch
  [183, 9033], // Crossed Legs
  [185, 9034], // Rest
  [187, 9035], // Sitting Sideways
  [189, 9036], // Dozing Cross-Legged
  [191, 9037], // Spread Out
  [195, 9039], // Balled Up
  [197, 9040], // What Do You Want?
  [201, 9041], // Prayer
  [203, 9042], // Desperate Prayer
  [205, 9043], // Rapture
  [207, 9045], // Erudition
  [209, 9046], // Outer Order
  [211, 9047], // Inner Order
  [213, 9048], // Golden Order Totality
  [217, 9049], // The Ring (pre-order)
  [219, 9050], // The Ring
  [223, 2009001], // May the Best Win
  [225, 2009002], // The Two Fingers
  [227, 2009000], // Ring of Miquella (pre-order)
  [229, 2009003], // Let Us Go Together
  [231, 2009004], // O Mother
  [233, 2009000], // Ring of Miquella
]);

/** Goods ids of the gestures this character has unlocked. */
export function unlockedGestureGoodsIds(slot: Readonly<Slot>): Set<number> {
  const ids = new Set<number>();
  for (const value of slot.gestures) {
    const goodsId = GESTURE_GOODS_ID_BY_SLOT_VALUE.get(value);
    if (goodsId !== undefined) ids.add(goodsId);
  }
  return ids;
}
