import type { Request, Response } from "express";
import type {
  CreateAssetInput,
  CreateInventoryItemInput,
  CreatePurchaseOrderInput,
  CreateStockMovementInput,
  CreateStoreInput,
  CreateStoreItemInput,
  CreateStoreOrderInput,
  ListAssetsQueryInput,
  ListInventoryItemsQueryInput,
  ListPurchaseOrdersQueryInput,
  ListStoreItemsQueryInput,
  ListStoreOrdersQueryInput,
  ListStoresQueryInput,
  ReceiveGrnInput,
} from "@vidyut/validation";
import { created, ok } from "../../core/envelope";
import * as service from "./service";

export async function createStore(req: Request, res: Response): Promise<void> {
  const store = await service.createStore(req.auth!, req.body as CreateStoreInput);
  created(res, store);
}

export async function listStores(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as ListStoresQueryInput;
  const stores = await service.listStores(req.auth!, query.branchId);
  ok(res, stores);
}

export async function createInventoryItem(req: Request, res: Response): Promise<void> {
  const item = await service.createInventoryItem(req.auth!, req.params.id!, req.body as CreateInventoryItemInput);
  created(res, item);
}

export async function listInventoryItems(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as ListInventoryItemsQueryInput;
  const items = await service.listInventoryItems(req.auth!, query.storeId);
  ok(res, items);
}

export async function createStockMovement(req: Request, res: Response): Promise<void> {
  const item = await service.createStockMovement(req.auth!, req.params.id!, req.body as CreateStockMovementInput);
  created(res, item);
}

export async function createPurchaseOrder(req: Request, res: Response): Promise<void> {
  const po = await service.createPurchaseOrder(req.auth!, req.body as CreatePurchaseOrderInput);
  created(res, po);
}

export async function listPurchaseOrders(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as ListPurchaseOrdersQueryInput;
  const pos = await service.listPurchaseOrders(req.auth!, query.branchId);
  ok(res, pos);
}

export async function receiveGrn(req: Request, res: Response): Promise<void> {
  const grn = await service.receiveGrn(req.auth!, req.params.id!, req.body as ReceiveGrnInput);
  created(res, grn);
}

export async function createAsset(req: Request, res: Response): Promise<void> {
  const asset = await service.createAsset(req.auth!, req.body as CreateAssetInput);
  created(res, asset);
}

export async function listAssets(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as ListAssetsQueryInput;
  const assets = await service.listAssets(req.auth!, query.branchId);
  ok(res, assets);
}

export async function createStoreItem(req: Request, res: Response): Promise<void> {
  const item = await service.createStoreItem(req.auth!, req.body as CreateStoreItemInput);
  created(res, item);
}

export async function listStoreItems(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as ListStoreItemsQueryInput;
  const items = await service.listStoreItems(req.auth!, query.branchId);
  ok(res, items);
}

export async function createStoreOrder(req: Request, res: Response): Promise<void> {
  const order = await service.createStoreOrder(req.auth!, req.body as CreateStoreOrderInput);
  created(res, order);
}

export async function listStoreOrders(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as ListStoreOrdersQueryInput;
  const orders = await service.listStoreOrders(req.auth!, query.studentId);
  ok(res, orders);
}
