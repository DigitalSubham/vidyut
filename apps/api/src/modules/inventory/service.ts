import { getCurrentSessionId, nextInvoiceNumber, withTenant } from "@vidyut/db";
import type {
  CreateAssetInput,
  CreateInventoryItemInput,
  CreatePurchaseOrderInput,
  CreateStockMovementInput,
  CreateStoreInput,
  CreateStoreItemInput,
  CreateStoreOrderInput,
  ReceiveGrnInput,
} from "@vidyut/validation";
import { AppError } from "../../core/errors";
import { branchAccessAllowed } from "../../core/guards/branch-scope";
import type { RequestAuth } from "../../core/guards/types";

function assertBranchAccess(auth: RequestAuth, branchId: string): void {
  if (!branchAccessAllowed(auth, branchId)) {
    throw new AppError("FORBIDDEN", "auth.errors.branchForbidden");
  }
}

export async function createStore(auth: RequestAuth, input: CreateStoreInput) {
  assertBranchAccess(auth, input.branchId);
  return withTenant(auth.tenantId, (tx) =>
    tx.store.create({ data: { tenantId: auth.tenantId, branchId: input.branchId, name: input.name } })
  );
}

export async function listStores(auth: RequestAuth, branchId: string) {
  assertBranchAccess(auth, branchId);
  return withTenant(auth.tenantId, (tx) => tx.store.findMany({ where: { branchId, deletedAt: null } }));
}

async function getStoreOrThrow(auth: RequestAuth, storeId: string) {
  const store = await withTenant(auth.tenantId, (tx) => tx.store.findUnique({ where: { id: storeId } }));
  if (!store) throw new AppError("NOT_FOUND", "inventory.errors.storeNotFound");
  return store;
}

export async function createInventoryItem(auth: RequestAuth, storeId: string, input: CreateInventoryItemInput) {
  const store = await getStoreOrThrow(auth, storeId);
  assertBranchAccess(auth, store.branchId);
  return withTenant(auth.tenantId, (tx) =>
    tx.inventoryItem.create({
      data: { tenantId: auth.tenantId, branchId: store.branchId, storeId, name: input.name, lowStockAt: input.lowStockAt },
    })
  );
}

export async function listInventoryItems(auth: RequestAuth, storeId: string) {
  const store = await getStoreOrThrow(auth, storeId);
  assertBranchAccess(auth, store.branchId);
  return withTenant(auth.tenantId, (tx) => tx.inventoryItem.findMany({ where: { storeId, deletedAt: null } }));
}

async function getItemOrThrow(auth: RequestAuth, itemId: string) {
  const item = await withTenant(auth.tenantId, (tx) => tx.inventoryItem.findUnique({ where: { id: itemId } }));
  if (!item) throw new AppError("NOT_FOUND", "inventory.errors.itemNotFound");
  return item;
}

/** Scope #1 — direct stock in/out. Low-stock alerting runs on the nightly cron scan (scope #5), not inline here. */
export async function createStockMovement(auth: RequestAuth, itemId: string, input: CreateStockMovementInput) {
  const item = await getItemOrThrow(auth, itemId);
  assertBranchAccess(auth, item.branchId);

  const delta = input.direction === "IN" ? input.quantity : -input.quantity;
  if (input.direction === "OUT" && item.quantity + delta < 0) {
    throw new AppError("VALIDATION_ERROR", "inventory.errors.insufficientStock");
  }

  return withTenant(auth.tenantId, async (tx) => {
    const [, updated] = await Promise.all([
      tx.stockMovement.create({
        data: {
          tenantId: auth.tenantId,
          branchId: item.branchId,
          itemId,
          direction: input.direction,
          quantity: input.quantity,
          reason: input.reason,
        },
      }),
      tx.inventoryItem.update({ where: { id: itemId }, data: { quantity: { increment: delta } } }),
    ]);
    return updated;
  });
}

export async function createPurchaseOrder(auth: RequestAuth, input: CreatePurchaseOrderInput) {
  assertBranchAccess(auth, input.branchId);
  return withTenant(auth.tenantId, (tx) =>
    tx.purchaseOrder.create({
      data: { tenantId: auth.tenantId, branchId: input.branchId, vendorName: input.vendorName, createdById: auth.userId },
    })
  );
}

export async function listPurchaseOrders(auth: RequestAuth, branchId: string) {
  assertBranchAccess(auth, branchId);
  return withTenant(auth.tenantId, (tx) => tx.purchaseOrder.findMany({ where: { branchId }, orderBy: { createdAt: "desc" } }));
}

/** Scope #2 — a simple two-step procurement flow: receiving a PO creates real StockMovement(IN) rows and closes the order. */
export async function receiveGrn(auth: RequestAuth, purchaseOrderId: string, input: ReceiveGrnInput) {
  return withTenant(auth.tenantId, async (tx) => {
    const po = await tx.purchaseOrder.findUnique({ where: { id: purchaseOrderId } });
    if (!po) throw new AppError("NOT_FOUND", "inventory.errors.purchaseOrderNotFound");
    assertBranchAccess(auth, po.branchId);
    if (po.status !== "PENDING") {
      throw new AppError("VALIDATION_ERROR", "inventory.errors.purchaseOrderAlreadyClosed");
    }

    const grn = await tx.grn.create({
      data: { tenantId: auth.tenantId, branchId: po.branchId, purchaseOrderId, receivedById: auth.userId },
    });

    for (const line of input.lines) {
      await tx.grnLine.create({
        data: { tenantId: auth.tenantId, grnId: grn.id, itemId: line.itemId, quantity: line.quantity },
      });
      await tx.stockMovement.create({
        data: {
          tenantId: auth.tenantId,
          branchId: po.branchId,
          itemId: line.itemId,
          direction: "IN",
          quantity: line.quantity,
          reason: `GRN for PO ${po.id}`,
        },
      });
      await tx.inventoryItem.update({ where: { id: line.itemId }, data: { quantity: { increment: line.quantity } } });
    }

    await tx.purchaseOrder.update({ where: { id: purchaseOrderId }, data: { status: "RECEIVED" } });
    return tx.grn.findUnique({ where: { id: grn.id }, include: { lines: true } });
  });
}

export async function createAsset(auth: RequestAuth, input: CreateAssetInput) {
  assertBranchAccess(auth, input.branchId);
  return withTenant(auth.tenantId, (tx) =>
    tx.asset.create({
      data: {
        tenantId: auth.tenantId,
        branchId: input.branchId,
        item: input.item,
        purchaseDate: input.purchaseDate,
        purchasePricePaise: input.purchasePricePaise,
        depreciationMethod: input.depreciationMethod,
      },
    })
  );
}

export async function listAssets(auth: RequestAuth, branchId: string) {
  assertBranchAccess(auth, branchId);
  return withTenant(auth.tenantId, (tx) => tx.asset.findMany({ where: { branchId, deletedAt: null } }));
}

/** Scope #4 (confirmed in scope) — a parent-facing catalog entry for an existing InventoryItem. */
export async function createStoreItem(auth: RequestAuth, input: CreateStoreItemInput) {
  const item = await getItemOrThrow(auth, input.itemId);
  assertBranchAccess(auth, item.branchId);
  return withTenant(auth.tenantId, (tx) =>
    tx.storeItem.create({
      data: { tenantId: auth.tenantId, branchId: item.branchId, itemId: input.itemId, pricePaise: input.pricePaise },
    })
  );
}

export async function listStoreItems(auth: RequestAuth, branchId: string) {
  assertBranchAccess(auth, branchId);
  return withTenant(auth.tenantId, (tx) => tx.storeItem.findMany({ where: { branchId } }));
}

/**
 * Scope #4 — a parent store order, invoiced via Unit 11/12's existing fee
 * engine (a one-off MISC FeeHead InvoiceItem, same pattern as Unit 58's
 * library fine), not a separate payment path. Also debits stock via a real
 * StockMovement(OUT).
 */
export async function createStoreOrder(auth: RequestAuth, input: CreateStoreOrderInput) {
  return withTenant(auth.tenantId, async (tx) => {
    const storeItem = await tx.storeItem.findUnique({ where: { id: input.storeItemId }, include: { item: true } });
    if (!storeItem) throw new AppError("NOT_FOUND", "inventory.errors.storeItemNotFound");
    if (storeItem.item.quantity < input.quantity) {
      throw new AppError("VALIDATION_ERROR", "inventory.errors.insufficientStock");
    }

    const sessionId = await getCurrentSessionId(tx, storeItem.branchId);
    if (!sessionId) {
      throw new AppError("VALIDATION_ERROR", "inventory.errors.noCurrentSession");
    }

    const feeHead =
      (await tx.feeHead.findFirst({ where: { branchId: storeItem.branchId, type: "MISC", name: "Store Purchase" } })) ??
      (await tx.feeHead.create({
        data: { tenantId: auth.tenantId, branchId: storeItem.branchId, name: "Store Purchase", type: "MISC" },
      }));

    const number = await nextInvoiceNumber(tx, storeItem.branchId);
    const totalAmount = storeItem.pricePaise * input.quantity;
    const invoice = await tx.invoice.create({
      data: {
        tenantId: auth.tenantId,
        branchId: storeItem.branchId,
        studentId: input.studentId,
        sessionId,
        number,
        periodLabel: `STORE-ORDER-${storeItem.id}-${Date.now()}`,
        dueDate: new Date(),
        items: { create: { tenantId: auth.tenantId, feeHeadId: feeHead.id, amount: totalAmount } },
      },
    });

    const [order] = await Promise.all([
      tx.storeOrder.create({
        data: {
          tenantId: auth.tenantId,
          branchId: storeItem.branchId,
          storeItemId: input.storeItemId,
          studentId: input.studentId,
          quantity: input.quantity,
          invoiceId: invoice.id,
        },
      }),
      tx.stockMovement.create({
        data: {
          tenantId: auth.tenantId,
          branchId: storeItem.branchId,
          itemId: storeItem.itemId,
          direction: "OUT",
          quantity: input.quantity,
          reason: `Store order for student ${input.studentId}`,
        },
      }),
      tx.inventoryItem.update({ where: { id: storeItem.itemId }, data: { quantity: { decrement: input.quantity } } }),
    ]);

    return order;
  });
}

export async function listStoreOrders(auth: RequestAuth, studentId?: string) {
  return withTenant(auth.tenantId, (tx) =>
    tx.storeOrder.findMany({ where: studentId ? { studentId } : {}, orderBy: { createdAt: "desc" } })
  );
}
