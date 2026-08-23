"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminApi, getAdminBranchId } from "@/lib/admin-client";

function RoutesTab() {
  const { t } = useTranslation();
  const branchId = getAdminBranchId() ?? "";
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [loadedRouteId, setLoadedRouteId] = useState("");
  const [stopForm, setStopForm] = useState({ name: "", sequence: 1, latitude: "", longitude: "" });

  const routesQuery = useQuery({
    queryKey: ["transport-routes", branchId],
    queryFn: () => adminApi.listRoutes(branchId),
    enabled: !!branchId,
  });
  const stopsQuery = useQuery({
    queryKey: ["transport-stops", loadedRouteId],
    queryFn: () => adminApi.listRouteStops(loadedRouteId),
    enabled: !!loadedRouteId,
  });

  const createRouteMutation = useMutation({
    mutationFn: () => adminApi.createRoute({ branchId, name }),
    onSuccess: () => {
      setName("");
      void queryClient.invalidateQueries({ queryKey: ["transport-routes", branchId] });
    },
  });

  const createStopMutation = useMutation({
    mutationFn: () =>
      adminApi.createRouteStop(loadedRouteId, {
        name: stopForm.name,
        sequence: Number(stopForm.sequence),
        latitude: stopForm.latitude ? Number(stopForm.latitude) : undefined,
        longitude: stopForm.longitude ? Number(stopForm.longitude) : undefined,
      }),
    onSuccess: () => {
      setStopForm({ name: "", sequence: 1, latitude: "", longitude: "" });
      void queryClient.invalidateQueries({ queryKey: ["transport-stops", loadedRouteId] });
    },
  });

  const routes = routesQuery.data?.data ?? [];
  const stops = stopsQuery.data?.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end gap-2 rounded-lg border border-border p-4">
        <div className="flex flex-col gap-1.5">
          <Label>{t("school.transport.routeName")}</Label>
          <Input className="max-w-xs" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <Button onClick={() => createRouteMutation.mutate()} disabled={!name}>
          {t("school.common.save")}
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("school.transport.routeName")}</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {routes.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-medium">{r.name}</TableCell>
              <TableCell>
                <Button variant="outline" size="sm" onClick={() => setLoadedRouteId(r.id)}>
                  {t("school.transport.viewStops")}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {loadedRouteId ? (
        <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
          <h3 className="font-heading text-lg font-semibold text-text-primary">{t("school.transport.stops")}</h3>
          <div className="flex flex-wrap items-end gap-2">
            <Input
              className="max-w-[10rem]"
              placeholder={t("school.transport.stopName") as string}
              value={stopForm.name}
              onChange={(e) => setStopForm({ ...stopForm, name: e.target.value })}
            />
            <Input
              className="max-w-[6rem]"
              type="number"
              placeholder={t("school.transport.sequence") as string}
              value={stopForm.sequence}
              onChange={(e) => setStopForm({ ...stopForm, sequence: Number(e.target.value) })}
            />
            <Input
              className="max-w-[8rem]"
              placeholder="Latitude"
              value={stopForm.latitude}
              onChange={(e) => setStopForm({ ...stopForm, latitude: e.target.value })}
            />
            <Input
              className="max-w-[8rem]"
              placeholder="Longitude"
              value={stopForm.longitude}
              onChange={(e) => setStopForm({ ...stopForm, longitude: e.target.value })}
            />
            <Button onClick={() => createStopMutation.mutate()} disabled={!stopForm.name}>
              {t("school.common.save")}
            </Button>
          </div>
          <ul className="flex flex-col gap-1 text-sm text-text-secondary">
            {stops.map((s) => (
              <li key={s.id}>
                {s.sequence}. {s.name} {s.latitude ? `(${s.latitude}, ${s.longitude})` : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function VehiclesTab() {
  const { t } = useTranslation();
  const branchId = getAdminBranchId() ?? "";
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ regNo: "", capacity: "", fitnessExpiry: "", insuranceExpiry: "", permitExpiry: "" });

  const vehiclesQuery = useQuery({
    queryKey: ["transport-vehicles", branchId],
    queryFn: () => adminApi.listVehicles(branchId),
    enabled: !!branchId,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      adminApi.createVehicle({
        branchId,
        regNo: form.regNo,
        capacity: form.capacity ? Number(form.capacity) : undefined,
        fitnessExpiry: form.fitnessExpiry || undefined,
        insuranceExpiry: form.insuranceExpiry || undefined,
        permitExpiry: form.permitExpiry || undefined,
      }),
    onSuccess: () => {
      setForm({ regNo: "", capacity: "", fitnessExpiry: "", insuranceExpiry: "", permitExpiry: "" });
      void queryClient.invalidateQueries({ queryKey: ["transport-vehicles", branchId] });
    },
  });

  const vehicles = vehiclesQuery.data?.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-2 rounded-lg border border-border p-4">
        <Input
          className="max-w-[10rem]"
          placeholder={t("school.transport.regNo") as string}
          value={form.regNo}
          onChange={(e) => setForm({ ...form, regNo: e.target.value })}
        />
        <Input
          className="max-w-[6rem]"
          type="number"
          placeholder={t("school.transport.capacity") as string}
          value={form.capacity}
          onChange={(e) => setForm({ ...form, capacity: e.target.value })}
        />
        <div className="flex flex-col gap-1">
          <Label className="text-xs">{t("school.transport.fitnessExpiry")}</Label>
          <Input type="date" value={form.fitnessExpiry} onChange={(e) => setForm({ ...form, fitnessExpiry: e.target.value })} />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs">{t("school.transport.insuranceExpiry")}</Label>
          <Input type="date" value={form.insuranceExpiry} onChange={(e) => setForm({ ...form, insuranceExpiry: e.target.value })} />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs">{t("school.transport.permitExpiry")}</Label>
          <Input type="date" value={form.permitExpiry} onChange={(e) => setForm({ ...form, permitExpiry: e.target.value })} />
        </div>
        <Button onClick={() => createMutation.mutate()} disabled={!form.regNo}>
          {t("school.common.save")}
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("school.transport.regNo")}</TableHead>
            <TableHead>{t("school.transport.capacity")}</TableHead>
            <TableHead>{t("school.transport.fitnessExpiry")}</TableHead>
            <TableHead>{t("school.transport.insuranceExpiry")}</TableHead>
            <TableHead>{t("school.transport.permitExpiry")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {vehicles.map((v) => (
            <TableRow key={v.id}>
              <TableCell className="font-medium">{v.regNo}</TableCell>
              <TableCell>{v.capacity ?? "—"}</TableCell>
              <TableCell>{v.fitnessExpiry ? new Date(v.fitnessExpiry).toLocaleDateString() : "—"}</TableCell>
              <TableCell>{v.insuranceExpiry ? new Date(v.insuranceExpiry).toLocaleDateString() : "—"}</TableCell>
              <TableCell>{v.permitExpiry ? new Date(v.permitExpiry).toLocaleDateString() : "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function DriversTab() {
  const { t } = useTranslation();
  const branchId = getAdminBranchId() ?? "";
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: "", phone: "", licenseNo: "" });

  const driversQuery = useQuery({
    queryKey: ["transport-drivers", branchId],
    queryFn: () => adminApi.listDrivers(branchId),
    enabled: !!branchId,
  });

  const createMutation = useMutation({
    mutationFn: () => adminApi.createDriver({ branchId, ...form }),
    onSuccess: () => {
      setForm({ name: "", phone: "", licenseNo: "" });
      void queryClient.invalidateQueries({ queryKey: ["transport-drivers", branchId] });
    },
  });

  const drivers = driversQuery.data?.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-2 rounded-lg border border-border p-4">
        <Input
          className="max-w-[10rem]"
          placeholder={t("school.students.name") as string}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <Input
          className="max-w-[10rem]"
          placeholder={t("school.transport.phone") as string}
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
        <Input
          className="max-w-[10rem]"
          placeholder={t("school.transport.licenseNo") as string}
          value={form.licenseNo}
          onChange={(e) => setForm({ ...form, licenseNo: e.target.value })}
        />
        <Button onClick={() => createMutation.mutate()} disabled={!form.name || !form.phone}>
          {t("school.common.save")}
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("school.students.name")}</TableHead>
            <TableHead>{t("school.transport.phone")}</TableHead>
            <TableHead>{t("school.transport.licenseNo")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {drivers.map((d) => (
            <TableRow key={d.id}>
              <TableCell className="font-medium">{d.name}</TableCell>
              <TableCell>{d.phone}</TableCell>
              <TableCell>{d.licenseNo ?? "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function AllocationsTab() {
  const { t } = useTranslation();
  const branchId = getAdminBranchId() ?? "";
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ studentId: "", routeId: "", stopId: "", fareAmountPaise: "" });

  const routesQuery = useQuery({
    queryKey: ["transport-routes", branchId],
    queryFn: () => adminApi.listRoutes(branchId),
    enabled: !!branchId,
  });
  const allocationsQuery = useQuery({
    queryKey: ["transport-allocations", form.routeId],
    queryFn: () => adminApi.listAllocations(form.routeId),
    enabled: !!form.routeId,
  });
  const stopsQuery = useQuery({
    queryKey: ["transport-stops", form.routeId],
    queryFn: () => adminApi.listRouteStops(form.routeId),
    enabled: !!form.routeId,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      adminApi.createAllocation({
        studentId: form.studentId,
        routeId: form.routeId,
        stopId: form.stopId,
        fareAmountPaise: Number(form.fareAmountPaise),
      }),
    onSuccess: () => {
      toast.success(t("school.transport.allocated") as string);
      void queryClient.invalidateQueries({ queryKey: ["transport-allocations", form.routeId] });
    },
  });

  const routes = routesQuery.data?.data ?? [];
  const stops = stopsQuery.data?.data ?? [];
  const allocations = allocationsQuery.data?.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-text-secondary">{t("school.transport.allocationHint")}</p>
      <div className="flex flex-wrap items-end gap-2 rounded-lg border border-border p-4">
        <Input
          className="max-w-[10rem]"
          placeholder={t("school.transport.studentId") as string}
          value={form.studentId}
          onChange={(e) => setForm({ ...form, studentId: e.target.value })}
        />
        <select
          className="h-9 rounded-md border border-border px-2 text-sm"
          value={form.routeId}
          onChange={(e) => setForm({ ...form, routeId: e.target.value, stopId: "" })}
        >
          <option value="">{t("school.transport.selectRoute")}</option>
          {routes.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <select
          className="h-9 rounded-md border border-border px-2 text-sm"
          value={form.stopId}
          onChange={(e) => setForm({ ...form, stopId: e.target.value })}
          disabled={!form.routeId}
        >
          <option value="">{t("school.transport.selectStop")}</option>
          {stops.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <Input
          className="max-w-[8rem]"
          type="number"
          placeholder={t("school.transport.farePaise") as string}
          value={form.fareAmountPaise}
          onChange={(e) => setForm({ ...form, fareAmountPaise: e.target.value })}
        />
        <Button
          onClick={() => createMutation.mutate()}
          disabled={!form.studentId || !form.routeId || !form.stopId || !form.fareAmountPaise}
        >
          {t("school.transport.allocate")}
        </Button>
      </div>

      {form.routeId ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("school.transport.studentId")}</TableHead>
              <TableHead>{t("school.transport.stopName")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allocations.map((a) => (
              <TableRow key={a.id}>
                <TableCell>{a.studentId}</TableCell>
                <TableCell>{stops.find((s) => s.id === a.stopId)?.name ?? a.stopId}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}
    </div>
  );
}

export default function TransportPage() {
  const { t } = useTranslation();
  const branchId = getAdminBranchId() ?? "";

  if (!branchId) {
    return <p className="text-text-secondary">{t("school.branchIdPlaceholder")}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-heading text-2xl font-semibold text-text-primary">{t("school.transport.title")}</h1>
      <Tabs defaultValue="routes">
        <TabsList>
          <TabsTrigger value="routes">{t("school.transport.routesTab")}</TabsTrigger>
          <TabsTrigger value="vehicles">{t("school.transport.vehiclesTab")}</TabsTrigger>
          <TabsTrigger value="drivers">{t("school.transport.driversTab")}</TabsTrigger>
          <TabsTrigger value="allocations">{t("school.transport.allocationsTab")}</TabsTrigger>
        </TabsList>
        <TabsContent value="routes">
          <RoutesTab />
        </TabsContent>
        <TabsContent value="vehicles">
          <VehiclesTab />
        </TabsContent>
        <TabsContent value="drivers">
          <DriversTab />
        </TabsContent>
        <TabsContent value="allocations">
          <AllocationsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
