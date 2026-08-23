import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { prisma, withTenant } from "@vidyut/db";
import { createApp } from "../src/app";
import { signAccessToken } from "../src/core/auth/jwt";
import { cleanupTenant, createBranch, createRoleWithPermissions, createTenant } from "./helpers";

const app = createApp();
const tenantIds: string[] = [];

afterAll(async () => {
  for (const id of tenantIds) {
    await cleanupTenant(id);
  }
  await prisma.$disconnect();
});

async function ownerToken(tenantId: string) {
  return signAccessToken({ sub: "owner-1", tenantId, roles: ["OWNER"], branchIds: [] });
}

describe("inventory — stores/items/stock movements, RBAC", () => {
  it("creates a store, an item, and correctly tracks stock via movements", async () => {
    const tenant = await createTenant("inventory-crud-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["inventory.manage"]);
    const owner = await ownerToken(tenant.id);
    const branch = await createBranch(tenant.id, "A");

    const storeRes = await request(app)
      .post("/api/v1/inventory/stores")
      .set("Authorization", `Bearer ${owner}`)
      .send({ branchId: branch.id, name: "Main Store" });
    expect(storeRes.status).toBe(201);
    const storeId = storeRes.body.data.id as string;

    const itemRes = await request(app)
      .post(`/api/v1/inventory/stores/${storeId}/items`)
      .set("Authorization", `Bearer ${owner}`)
      .send({ name: "Notebook", lowStockAt: 10 });
    expect(itemRes.status).toBe(201);
    const itemId = itemRes.body.data.id as string;

    const inRes = await request(app)
      .post(`/api/v1/inventory/items/${itemId}/movements`)
      .set("Authorization", `Bearer ${owner}`)
      .send({ direction: "IN", quantity: 50, reason: "Initial stock" });
    expect(inRes.status).toBe(201);
    expect(inRes.body.data.quantity).toBe(50);

    const outRes = await request(app)
      .post(`/api/v1/inventory/items/${itemId}/movements`)
      .set("Authorization", `Bearer ${owner}`)
      .send({ direction: "OUT", quantity: 20, reason: "Issued to class 5" });
    expect(outRes.status).toBe(201);
    expect(outRes.body.data.quantity).toBe(30);

    // Over-drawing stock is rejected.
    const overRes = await request(app)
      .post(`/api/v1/inventory/items/${itemId}/movements`)
      .set("Authorization", `Bearer ${owner}`)
      .send({ direction: "OUT", quantity: 1000, reason: "Too many" });
    expect(overRes.status).toBe(422);
  });

  it("RBAC: a caller without inventory.manage is denied", async () => {
    const tenant = await createTenant("inventory-rbac-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "TEACHER", []);
    const branch = await createBranch(tenant.id, "A");
    const teacher = await signAccessToken({ sub: "t-1", tenantId: tenant.id, roles: ["TEACHER"], branchIds: [branch.id] });

    const res = await request(app)
      .post("/api/v1/inventory/stores")
      .set("Authorization", `Bearer ${teacher}`)
      .send({ branchId: branch.id, name: "X" });
    expect(res.status).toBe(403);
  });
});

describe("inventory — purchase order + GRN correctly increments stock (scope #2)", () => {
  it("receiving a GRN creates real StockMovement(IN) rows and closes the order", async () => {
    const tenant = await createTenant("inventory-grn-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["inventory.manage"]);
    const owner = await ownerToken(tenant.id);
    const branch = await createBranch(tenant.id, "A");

    const storeRes = await request(app)
      .post("/api/v1/inventory/stores")
      .set("Authorization", `Bearer ${owner}`)
      .send({ branchId: branch.id, name: "Store B" });
    const storeId = storeRes.body.data.id as string;
    const itemRes = await request(app)
      .post(`/api/v1/inventory/stores/${storeId}/items`)
      .set("Authorization", `Bearer ${owner}`)
      .send({ name: "Chalk box" });
    const itemId = itemRes.body.data.id as string;

    const poRes = await request(app)
      .post("/api/v1/inventory/purchase-orders")
      .set("Authorization", `Bearer ${owner}`)
      .send({ branchId: branch.id, vendorName: "Stationery Vendor" });
    const poId = poRes.body.data.id as string;

    const grnRes = await request(app)
      .post(`/api/v1/inventory/purchase-orders/${poId}/grn`)
      .set("Authorization", `Bearer ${owner}`)
      .send({ lines: [{ itemId, quantity: 15 }] });
    expect(grnRes.status).toBe(201);

    const item = await withTenant(tenant.id, (tx) => tx.inventoryItem.findUnique({ where: { id: itemId } }));
    expect(item?.quantity).toBe(15);

    const po = await withTenant(tenant.id, (tx) => tx.purchaseOrder.findUnique({ where: { id: poId } }));
    expect(po?.status).toBe("RECEIVED");
  });
});

describe("inventory — parent store order reuses the existing fee engine (scope #4, confirmed in scope)", () => {
  it("creates a StoreOrder that generates a real Invoice/InvoiceItem and debits stock", async () => {
    const tenant = await createTenant("inventory-store-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["inventory.manage"]);
    const owner = await ownerToken(tenant.id);
    const branch = await createBranch(tenant.id, "A");
    await withTenant(tenant.id, (tx) =>
      tx.academicSession.create({
        data: { tenantId: tenant.id, branchId: branch.id, name: "2025-26", startDate: new Date("2025-04-01"), endDate: new Date("2026-03-31"), isCurrent: true },
      })
    );
    const student = await withTenant(tenant.id, (tx) =>
      tx.student.create({
        data: { tenantId: tenant.id, branchId: branch.id, admissionNo: "ADM-INV1", firstName: "I", lastName: "One", dob: new Date("2012-01-01"), gender: "M", address: "Patna" },
      })
    );

    const storeRes = await request(app)
      .post("/api/v1/inventory/stores")
      .set("Authorization", `Bearer ${owner}`)
      .send({ branchId: branch.id, name: "Uniform Store" });
    const storeId = storeRes.body.data.id as string;
    const itemRes = await request(app)
      .post(`/api/v1/inventory/stores/${storeId}/items`)
      .set("Authorization", `Bearer ${owner}`)
      .send({ name: "School Shirt" });
    const itemId = itemRes.body.data.id as string;
    await request(app)
      .post(`/api/v1/inventory/items/${itemId}/movements`)
      .set("Authorization", `Bearer ${owner}`)
      .send({ direction: "IN", quantity: 10, reason: "Stock arrival" });

    const storeItemRes = await request(app)
      .post("/api/v1/inventory/store-items")
      .set("Authorization", `Bearer ${owner}`)
      .send({ itemId, pricePaise: 50000 });
    const storeItemId = storeItemRes.body.data.id as string;

    const orderRes = await request(app)
      .post("/api/v1/inventory/store-orders")
      .set("Authorization", `Bearer ${owner}`)
      .send({ storeItemId, studentId: student.id, quantity: 2 });
    expect(orderRes.status).toBe(201);
    expect(orderRes.body.data.invoiceId).toBeTruthy();

    const invoice = await withTenant(tenant.id, (tx) =>
      tx.invoice.findUnique({ where: { id: orderRes.body.data.invoiceId }, include: { items: { include: { feeHead: true } } } })
    );
    expect(invoice!.items[0]!.amount).toBe(100000);
    expect(invoice!.items[0]!.feeHead.type).toBe("MISC");

    const item = await withTenant(tenant.id, (tx) => tx.inventoryItem.findUnique({ where: { id: itemId } }));
    expect(item?.quantity).toBe(8);
  });
});
