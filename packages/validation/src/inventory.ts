import { z } from "zod";

// --- Unit 64: Inventory, Assets & Procurement ---

export const createStoreSchema = z.object({
  branchId: z.string().min(1, "inventory.errors.branchRequired"),
  name: z.string().trim().min(1, "inventory.errors.nameRequired"),
});
export type CreateStoreInput = z.infer<typeof createStoreSchema>;

export const listStoresQuerySchema = z.object({
  branchId: z.string().min(1, "inventory.errors.branchRequired"),
});
export type ListStoresQueryInput = z.infer<typeof listStoresQuerySchema>;

export const createInventoryItemSchema = z.object({
  name: z.string().trim().min(1, "inventory.errors.nameRequired"),
  lowStockAt: z.coerce.number().int().min(0).optional(),
});
export type CreateInventoryItemInput = z.infer<typeof createInventoryItemSchema>;

export const listInventoryItemsQuerySchema = z.object({
  storeId: z.string().min(1, "inventory.errors.storeRequired"),
});
export type ListInventoryItemsQueryInput = z.infer<typeof listInventoryItemsQuerySchema>;

const stockDirectionValues = ["IN", "OUT"] as const;

export const createStockMovementSchema = z.object({
  direction: z.enum(stockDirectionValues),
  quantity: z.coerce.number().int().positive(),
  reason: z.string().trim().min(1, "inventory.errors.reasonRequired"),
});
export type CreateStockMovementInput = z.infer<typeof createStockMovementSchema>;

export const createPurchaseOrderSchema = z.object({
  branchId: z.string().min(1, "inventory.errors.branchRequired"),
  vendorName: z.string().trim().min(1, "inventory.errors.vendorRequired"),
});
export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>;

export const listPurchaseOrdersQuerySchema = z.object({
  branchId: z.string().min(1, "inventory.errors.branchRequired"),
});
export type ListPurchaseOrdersQueryInput = z.infer<typeof listPurchaseOrdersQuerySchema>;

export const receiveGrnSchema = z.object({
  lines: z
    .array(z.object({ itemId: z.string().min(1), quantity: z.coerce.number().int().positive() }))
    .min(1, "inventory.errors.linesRequired"),
});
export type ReceiveGrnInput = z.infer<typeof receiveGrnSchema>;

export const createAssetSchema = z.object({
  branchId: z.string().min(1, "inventory.errors.branchRequired"),
  item: z.string().trim().min(1, "inventory.errors.itemRequired"),
  purchaseDate: z.coerce.date(),
  purchasePricePaise: z.coerce.number().int().min(0),
  depreciationMethod: z.string().trim().min(1).optional(),
});
export type CreateAssetInput = z.infer<typeof createAssetSchema>;

export const listAssetsQuerySchema = z.object({
  branchId: z.string().min(1, "inventory.errors.branchRequired"),
});
export type ListAssetsQueryInput = z.infer<typeof listAssetsQuerySchema>;

/** Scope #4 (confirmed in scope) — a parent-facing catalog entry for an InventoryItem. */
export const createStoreItemSchema = z.object({
  itemId: z.string().min(1, "inventory.errors.itemRequired"),
  pricePaise: z.coerce.number().int().positive(),
});
export type CreateStoreItemInput = z.infer<typeof createStoreItemSchema>;

export const listStoreItemsQuerySchema = z.object({
  branchId: z.string().min(1, "inventory.errors.branchRequired"),
});
export type ListStoreItemsQueryInput = z.infer<typeof listStoreItemsQuerySchema>;

/** Reuses Unit 11/12's fee engine (MISC FeeHead) — no separate payment path. */
export const createStoreOrderSchema = z.object({
  storeItemId: z.string().min(1, "inventory.errors.storeItemRequired"),
  studentId: z.string().min(1, "inventory.errors.studentRequired"),
  quantity: z.coerce.number().int().positive(),
});
export type CreateStoreOrderInput = z.infer<typeof createStoreOrderSchema>;

export const listStoreOrdersQuerySchema = z.object({
  studentId: z.string().min(1).optional(),
});
export type ListStoreOrdersQueryInput = z.infer<typeof listStoreOrdersQuerySchema>;
