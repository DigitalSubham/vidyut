"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminApi, getAdminBranchId } from "@/lib/admin-client";

function StockTab() {
  const { t } = useTranslation();
  const branchId = getAdminBranchId() ?? "";
  const queryClient = useQueryClient();
  const [storeName, setStoreName] = useState("");
  const [loadedStoreId, setLoadedStoreId] = useState("");
  const [itemForm, setItemForm] = useState({ name: "", lowStockAt: "" });
  const [movement, setMovement] = useState({ itemId: "", direction: "IN", quantity: "", reason: "" });

  const storesQuery = useQuery({
    queryKey: ["inventory-stores", branchId],
    queryFn: () => adminApi.listStores(branchId),
    enabled: !!branchId,
  });
  const itemsQuery = useQuery({
    queryKey: ["inventory-items", loadedStoreId],
    queryFn: () => adminApi.listInventoryItems(loadedStoreId),
    enabled: !!loadedStoreId,
  });

  const createStoreMutation = useMutation({
    mutationFn: () => adminApi.createStore({ branchId, name: storeName }),
    onSuccess: () => {
      setStoreName("");
      void queryClient.invalidateQueries({ queryKey: ["inventory-stores", branchId] });
    },
  });
  const createItemMutation = useMutation({
    mutationFn: () =>
      adminApi.createInventoryItem(loadedStoreId, {
        name: itemForm.name,
        lowStockAt: itemForm.lowStockAt ? Number(itemForm.lowStockAt) : undefined,
      }),
    onSuccess: () => {
      setItemForm({ name: "", lowStockAt: "" });
      void queryClient.invalidateQueries({ queryKey: ["inventory-items", loadedStoreId] });
    },
  });
  const movementMutation = useMutation({
    mutationFn: () =>
      adminApi.createStockMovement(movement.itemId, {
        direction: movement.direction as "IN" | "OUT",
        quantity: Number(movement.quantity),
        reason: movement.reason,
      }),
    onSuccess: () => {
      setMovement({ itemId: "", direction: "IN", quantity: "", reason: "" });
      void queryClient.invalidateQueries({ queryKey: ["inventory-items", loadedStoreId] });
    },
  });

  const stores = storesQuery.data?.data ?? [];
  const items = itemsQuery.data?.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end gap-2 rounded-lg border border-border p-4">
        <Input className="max-w-xs" placeholder={t("school.inventory.storeName") as string} value={storeName} onChange={(e) => setStoreName(e.target.value)} />
        <Button onClick={() => createStoreMutation.mutate()} disabled={!storeName}>
          {t("school.common.save")}
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("school.inventory.storeName")}</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {stores.map((s) => (
            <TableRow key={s.id}>
              <TableCell className="font-medium">{s.name}</TableCell>
              <TableCell>
                <Button variant="outline" size="sm" onClick={() => setLoadedStoreId(s.id)}>
                  {t("school.inventory.viewItems")}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {loadedStoreId ? (
        <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
          <h3 className="font-heading text-lg font-semibold text-text-primary">{t("school.inventory.items")}</h3>
          <div className="flex flex-wrap items-end gap-2">
            <Input
              className="max-w-[10rem]"
              placeholder={t("school.inventory.itemName") as string}
              value={itemForm.name}
              onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
            />
            <Input
              className="max-w-[8rem]"
              type="number"
              placeholder={t("school.inventory.lowStockAt") as string}
              value={itemForm.lowStockAt}
              onChange={(e) => setItemForm({ ...itemForm, lowStockAt: e.target.value })}
            />
            <Button onClick={() => createItemMutation.mutate()} disabled={!itemForm.name}>
              {t("school.common.save")}
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("school.inventory.itemName")}</TableHead>
                <TableHead>{t("school.inventory.quantity")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((i) => (
                <TableRow key={i.id}>
                  <TableCell>{i.name}</TableCell>
                  <TableCell>{i.quantity}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex flex-wrap items-end gap-2">
            <Input
              className="max-w-[10rem]"
              placeholder={t("school.inventory.itemId") as string}
              value={movement.itemId}
              onChange={(e) => setMovement({ ...movement, itemId: e.target.value })}
            />
            <select
              className="h-9 rounded-md border border-border px-2 text-sm"
              value={movement.direction}
              onChange={(e) => setMovement({ ...movement, direction: e.target.value })}
            >
              <option value="IN">IN</option>
              <option value="OUT">OUT</option>
            </select>
            <Input
              className="max-w-[6rem]"
              type="number"
              placeholder={t("school.inventory.quantity") as string}
              value={movement.quantity}
              onChange={(e) => setMovement({ ...movement, quantity: e.target.value })}
            />
            <Input
              className="max-w-[10rem]"
              placeholder={t("school.inventory.reason") as string}
              value={movement.reason}
              onChange={(e) => setMovement({ ...movement, reason: e.target.value })}
            />
            <Button onClick={() => movementMutation.mutate()} disabled={!movement.itemId || !movement.quantity || !movement.reason}>
              {t("school.inventory.recordMovement")}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PurchaseOrdersTab() {
  const { t } = useTranslation();
  const branchId = getAdminBranchId() ?? "";
  const queryClient = useQueryClient();
  const [vendorName, setVendorName] = useState("");
  const [grnForm, setGrnForm] = useState({ purchaseOrderId: "", itemId: "", quantity: "" });

  const posQuery = useQuery({
    queryKey: ["inventory-pos", branchId],
    queryFn: () => adminApi.listPurchaseOrders(branchId),
    enabled: !!branchId,
  });

  const createPoMutation = useMutation({
    mutationFn: () => adminApi.createPurchaseOrder({ branchId, vendorName }),
    onSuccess: () => {
      setVendorName("");
      void queryClient.invalidateQueries({ queryKey: ["inventory-pos", branchId] });
    },
  });
  const receiveMutation = useMutation({
    mutationFn: () =>
      adminApi.receiveGrn(grnForm.purchaseOrderId, [{ itemId: grnForm.itemId, quantity: Number(grnForm.quantity) }]),
    onSuccess: () => {
      setGrnForm({ purchaseOrderId: "", itemId: "", quantity: "" });
      void queryClient.invalidateQueries({ queryKey: ["inventory-pos", branchId] });
    },
  });

  const pos = posQuery.data?.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end gap-2 rounded-lg border border-border p-4">
        <Input className="max-w-xs" placeholder={t("school.inventory.vendorName") as string} value={vendorName} onChange={(e) => setVendorName(e.target.value)} />
        <Button onClick={() => createPoMutation.mutate()} disabled={!vendorName}>
          {t("school.inventory.createPo")}
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("school.inventory.vendorName")}</TableHead>
            <TableHead>{t("school.frontOffice.status")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pos.map((p) => (
            <TableRow key={p.id}>
              <TableCell>{p.vendorName}</TableCell>
              <TableCell>{p.status}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
        <h3 className="font-heading text-lg font-semibold text-text-primary">{t("school.inventory.receiveGrn")}</h3>
        <div className="flex flex-wrap items-end gap-2">
          <Input
            className="max-w-[12rem]"
            placeholder={t("school.inventory.purchaseOrderId") as string}
            value={grnForm.purchaseOrderId}
            onChange={(e) => setGrnForm({ ...grnForm, purchaseOrderId: e.target.value })}
          />
          <Input
            className="max-w-[10rem]"
            placeholder={t("school.inventory.itemId") as string}
            value={grnForm.itemId}
            onChange={(e) => setGrnForm({ ...grnForm, itemId: e.target.value })}
          />
          <Input
            className="max-w-[6rem]"
            type="number"
            placeholder={t("school.inventory.quantity") as string}
            value={grnForm.quantity}
            onChange={(e) => setGrnForm({ ...grnForm, quantity: e.target.value })}
          />
          <Button
            onClick={() => receiveMutation.mutate()}
            disabled={!grnForm.purchaseOrderId || !grnForm.itemId || !grnForm.quantity}
          >
            {t("school.common.save")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function AssetsTab() {
  const { t } = useTranslation();
  const branchId = getAdminBranchId() ?? "";
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ item: "", purchaseDate: "", purchasePricePaise: "" });

  const assetsQuery = useQuery({
    queryKey: ["inventory-assets", branchId],
    queryFn: () => adminApi.listAssets(branchId),
    enabled: !!branchId,
  });
  const createMutation = useMutation({
    mutationFn: () =>
      adminApi.createAsset({
        branchId,
        item: form.item,
        purchaseDate: form.purchaseDate,
        purchasePricePaise: Number(form.purchasePricePaise),
      }),
    onSuccess: () => {
      setForm({ item: "", purchaseDate: "", purchasePricePaise: "" });
      void queryClient.invalidateQueries({ queryKey: ["inventory-assets", branchId] });
    },
  });

  const assets = assetsQuery.data?.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-2 rounded-lg border border-border p-4">
        <Input
          className="max-w-[10rem]"
          placeholder={t("school.inventory.assetItem") as string}
          value={form.item}
          onChange={(e) => setForm({ ...form, item: e.target.value })}
        />
        <Input type="date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} />
        <Input
          className="max-w-[8rem]"
          type="number"
          placeholder={t("school.accounting.amountPaise") as string}
          value={form.purchasePricePaise}
          onChange={(e) => setForm({ ...form, purchasePricePaise: e.target.value })}
        />
        <Button onClick={() => createMutation.mutate()} disabled={!form.item || !form.purchaseDate}>
          {t("school.common.save")}
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("school.inventory.assetItem")}</TableHead>
            <TableHead>{t("school.accounting.date")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {assets.map((a) => (
            <TableRow key={a.id}>
              <TableCell>{a.item}</TableCell>
              <TableCell>{new Date(a.purchaseDate).toLocaleDateString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function ParentStoreTab() {
  const { t } = useTranslation();
  const branchId = getAdminBranchId() ?? "";
  const queryClient = useQueryClient();
  const [storeItemForm, setStoreItemForm] = useState({ itemId: "", pricePaise: "" });
  const [orderForm, setOrderForm] = useState({ storeItemId: "", studentId: "", quantity: "" });

  const catalogQuery = useQuery({
    queryKey: ["inventory-store-items", branchId],
    queryFn: () => adminApi.listStoreItems(branchId),
    enabled: !!branchId,
  });
  const listCatalogMutation = useMutation({
    mutationFn: () => adminApi.createStoreItem({ itemId: storeItemForm.itemId, pricePaise: Number(storeItemForm.pricePaise) }),
    onSuccess: () => {
      setStoreItemForm({ itemId: "", pricePaise: "" });
      void queryClient.invalidateQueries({ queryKey: ["inventory-store-items", branchId] });
    },
  });
  const createOrderMutation = useMutation({
    mutationFn: () =>
      adminApi.createStoreOrder({
        storeItemId: orderForm.storeItemId,
        studentId: orderForm.studentId,
        quantity: Number(orderForm.quantity),
      }),
    onSuccess: () => setOrderForm({ storeItemId: "", studentId: "", quantity: "" }),
  });

  const catalog = catalogQuery.data?.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-text-secondary">{t("school.inventory.storeHint")}</p>
      <div className="flex flex-wrap items-end gap-2 rounded-lg border border-border p-4">
        <Input
          className="max-w-[10rem]"
          placeholder={t("school.inventory.itemId") as string}
          value={storeItemForm.itemId}
          onChange={(e) => setStoreItemForm({ ...storeItemForm, itemId: e.target.value })}
        />
        <Input
          className="max-w-[8rem]"
          type="number"
          placeholder={t("school.accounting.amountPaise") as string}
          value={storeItemForm.pricePaise}
          onChange={(e) => setStoreItemForm({ ...storeItemForm, pricePaise: e.target.value })}
        />
        <Button onClick={() => listCatalogMutation.mutate()} disabled={!storeItemForm.itemId || !storeItemForm.pricePaise}>
          {t("school.inventory.listInStore")}
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("school.inventory.itemId")}</TableHead>
            <TableHead>{t("school.accounting.amountPaise")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {catalog.map((c) => (
            <TableRow key={c.id}>
              <TableCell>{c.itemId}</TableCell>
              <TableCell>{(c.pricePaise / 100).toFixed(2)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
        <h3 className="font-heading text-lg font-semibold text-text-primary">{t("school.inventory.placeOrder")}</h3>
        <div className="flex flex-wrap items-end gap-2">
          <Input
            className="max-w-[12rem]"
            placeholder={t("school.frontOffice.studentId") as string}
            value={orderForm.studentId}
            onChange={(e) => setOrderForm({ ...orderForm, studentId: e.target.value })}
          />
          <select
            className="h-9 rounded-md border border-border px-2 text-sm"
            value={orderForm.storeItemId}
            onChange={(e) => setOrderForm({ ...orderForm, storeItemId: e.target.value })}
          >
            <option value="">{t("school.inventory.selectStoreItem")}</option>
            {catalog.map((c) => (
              <option key={c.id} value={c.id}>
                {c.itemId}
              </option>
            ))}
          </select>
          <Input
            className="max-w-[6rem]"
            type="number"
            placeholder={t("school.inventory.quantity") as string}
            value={orderForm.quantity}
            onChange={(e) => setOrderForm({ ...orderForm, quantity: e.target.value })}
          />
          <Button
            onClick={() => createOrderMutation.mutate()}
            disabled={!orderForm.storeItemId || !orderForm.studentId || !orderForm.quantity}
          >
            {t("school.inventory.placeOrder")}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function InventoryPage() {
  const { t } = useTranslation();
  const branchId = getAdminBranchId() ?? "";

  if (!branchId) {
    return <p className="text-text-secondary">{t("school.branchIdPlaceholder")}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-heading text-2xl font-semibold text-text-primary">{t("school.inventory.title")}</h1>
      <Tabs defaultValue="stock">
        <TabsList>
          <TabsTrigger value="stock">{t("school.inventory.stockTab")}</TabsTrigger>
          <TabsTrigger value="purchaseOrders">{t("school.inventory.purchaseOrdersTab")}</TabsTrigger>
          <TabsTrigger value="assets">{t("school.inventory.assetsTab")}</TabsTrigger>
          <TabsTrigger value="parentStore">{t("school.inventory.parentStoreTab")}</TabsTrigger>
        </TabsList>
        <TabsContent value="stock">
          <StockTab />
        </TabsContent>
        <TabsContent value="purchaseOrders">
          <PurchaseOrdersTab />
        </TabsContent>
        <TabsContent value="assets">
          <AssetsTab />
        </TabsContent>
        <TabsContent value="parentStore">
          <ParentStoreTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
