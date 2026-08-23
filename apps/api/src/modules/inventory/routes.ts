import { Router } from "express";
import {
  createAssetSchema,
  createInventoryItemSchema,
  createPurchaseOrderSchema,
  createStockMovementSchema,
  createStoreItemSchema,
  createStoreOrderSchema,
  createStoreSchema,
  listAssetsQuerySchema,
  listInventoryItemsQuerySchema,
  listPurchaseOrdersQuerySchema,
  listStoreItemsQuerySchema,
  listStoreOrdersQuerySchema,
  listStoresQuerySchema,
  receiveGrnSchema,
} from "@vidyut/validation";
import { asyncHandler } from "../../core/envelope";
import { authGuard } from "../../core/guards/auth-guard";
import { tenantContext } from "../../core/guards/tenant-context";
import { requirePermission } from "../../core/guards/require-permission";
import { validateBody, validateQuery } from "../../core/guards/validate";
import * as controller from "./controller";

export const inventoryRouter = Router();

inventoryRouter.use(authGuard, tenantContext, requirePermission("inventory.manage"));

inventoryRouter.post("/stores", validateBody(createStoreSchema), asyncHandler(controller.createStore));
inventoryRouter.get("/stores", validateQuery(listStoresQuerySchema), asyncHandler(controller.listStores));

inventoryRouter.post(
  "/stores/:id/items",
  validateBody(createInventoryItemSchema),
  asyncHandler(controller.createInventoryItem)
);
inventoryRouter.get(
  "/items",
  validateQuery(listInventoryItemsQuerySchema),
  asyncHandler(controller.listInventoryItems)
);
inventoryRouter.post(
  "/items/:id/movements",
  validateBody(createStockMovementSchema),
  asyncHandler(controller.createStockMovement)
);

inventoryRouter.post(
  "/purchase-orders",
  validateBody(createPurchaseOrderSchema),
  asyncHandler(controller.createPurchaseOrder)
);
inventoryRouter.get(
  "/purchase-orders",
  validateQuery(listPurchaseOrdersQuerySchema),
  asyncHandler(controller.listPurchaseOrders)
);
inventoryRouter.post(
  "/purchase-orders/:id/grn",
  validateBody(receiveGrnSchema),
  asyncHandler(controller.receiveGrn)
);

inventoryRouter.post("/assets", validateBody(createAssetSchema), asyncHandler(controller.createAsset));
inventoryRouter.get("/assets", validateQuery(listAssetsQuerySchema), asyncHandler(controller.listAssets));

inventoryRouter.post("/store-items", validateBody(createStoreItemSchema), asyncHandler(controller.createStoreItem));
inventoryRouter.get(
  "/store-items",
  validateQuery(listStoreItemsQuerySchema),
  asyncHandler(controller.listStoreItems)
);

inventoryRouter.post("/store-orders", validateBody(createStoreOrderSchema), asyncHandler(controller.createStoreOrder));
inventoryRouter.get(
  "/store-orders",
  validateQuery(listStoreOrdersQuerySchema),
  asyncHandler(controller.listStoreOrders)
);
