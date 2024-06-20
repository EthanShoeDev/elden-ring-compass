import { z } from 'zod';

// We're keeping a simple non-relational schema here.
// IRL, you will have a schema for your data models.
export const inventoryItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  quantity: z.number(),
  type: z.enum(['EMPTY', 'WEAPON', 'ARMOR', 'ACCESSORY', 'ITEM', 'AOW']),
  status: z.enum(['backlog', 'todo', 'in progress', 'done', 'canceled']),
  priority: z.enum(['low', 'medium', 'high']),
  tags: z.string().array(),
});

export type InventoryItem = z.infer<typeof inventoryItemSchema>;
