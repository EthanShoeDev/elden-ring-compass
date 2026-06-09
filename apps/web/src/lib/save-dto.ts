// The web-facing save DTO is the parser package's `LeanSave` — single source of truth. The
// historical `Wasm*`/`Slot` names predate the TS port; they're kept here as thin aliases so the
// app's view-models import a stable shape without churn, and so there's no `as unknown as` bridge
// cast between two structurally-identical-but-separate declarations. Produced by `parseSave`
// (`@elden-ring-compass/save-parser-ts`) — see `er-save-parser.ts`.
import type {
  LeanChrAsm,
  LeanEquipItem,
  LeanEquipItemData,
  LeanEventFlags,
  LeanGaItem,
  LeanInventory,
  LeanInventoryItem,
  LeanPlayerCoords,
  LeanPlayerGameData,
  LeanRegions,
  LeanSave,
  LeanSlot,
  LeanSpEffect,
} from '@elden-ring-compass/save-parser-ts';

export type WasmEldenRingSave = LeanSave;
export type Slot = LeanSlot;
export type PlayerGameData = LeanPlayerGameData;
export type PlayerCoords = LeanPlayerCoords;
export type Regions = LeanRegions;
export type EventFlags = LeanEventFlags;
export type GaItem = LeanGaItem;
export type ChrAsm2 = LeanChrAsm;
export type CommonItem = LeanInventoryItem;
export type EquipInventoryData = LeanInventory;
export type StorageInventoryData = LeanInventory;
export type EquipItem = LeanEquipItem;
export type EquipItemData = LeanEquipItemData;
export type SpEffect = LeanSpEffect;
