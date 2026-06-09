// The web-facing save DTO is the parser package's `LeanSave` — single source of truth. The
// historical `Wasm*`/`Slot` names predate the TS port; they're kept here as thin aliases so the
// app's view-models import a stable shape without churn, and so there's no `as unknown as` bridge
// cast between two structurally-identical-but-separate declarations. Produced by `parseSave`
// (`@elden-ring-compass/save-parser-ts`) — see `er-save-parser.ts`.
import type {
  LeanGaItem,
  LeanInventory,
  LeanSave,
  LeanSlot,
} from '@elden-ring-compass/save-parser-ts';

export type WasmEldenRingSave = LeanSave;
export type Slot = LeanSlot;
export type GaItem = LeanGaItem;
export type EquipInventoryData = LeanInventory;
