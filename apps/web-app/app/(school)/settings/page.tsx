"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { PERMISSIONS } from "@vidyut/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminApi, getAdminBranchId } from "@/lib/admin-client";

const STAFF_ROLE_OPTIONS = ["PRINCIPAL", "ADMIN", "ACCOUNTANT", "TEACHER", "CUSTOM"] as const;

function SchoolProfileTab() {
  const { t } = useTranslation();
  // No GET /tenants/me/profile endpoint exists (Unit 36's scope is PATCH
  // only) — the form starts blank; saving only sends the fields the owner
  // actually filled in, leaving the rest of the tenant row untouched.
  const [form, setForm] = useState({ name: "", address: "", logoUrl: "", admissionNoPrefix: "", invoiceNoPrefix: "" });

  const mutation = useMutation({
    mutationFn: () => adminApi.patchTenantProfile(Object.fromEntries(Object.entries(form).filter(([, v]) => v !== ""))),
    onSuccess: () => toast.success(t("school.settings.saved") as string),
  });

  return (
    <div className="flex max-w-md flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label>{t("school.settings.name")}</Label>
        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>{t("school.settings.address")}</Label>
        <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>{t("school.settings.logoUrl")}</Label>
        <Input value={form.logoUrl} onChange={(e) => setForm({ ...form, logoUrl: e.target.value })} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>{t("school.settings.admissionNoPrefix")}</Label>
        <Input
          value={form.admissionNoPrefix}
          onChange={(e) => setForm({ ...form, admissionNoPrefix: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>{t("school.settings.invoiceNoPrefix")}</Label>
        <Input value={form.invoiceNoPrefix} onChange={(e) => setForm({ ...form, invoiceNoPrefix: e.target.value })} />
      </div>
      <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
        {t("school.common.save")}
      </Button>
    </div>
  );
}

function BranchesTab() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["branches"], queryFn: () => adminApi.listBranches() });
  const branches = data?.data ?? [];
  const [form, setForm] = useState({ name: "", code: "" });

  const createMutation = useMutation({
    mutationFn: () => adminApi.createBranch(form),
    onSuccess: () => {
      setForm({ name: "", code: "" });
      void queryClient.invalidateQueries({ queryKey: ["branches"] });
    },
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => adminApi.patchBranch(id, { isActive }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["branches"] }),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1.5">
          <Label>{t("school.settings.branchName")}</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>{t("school.settings.branchCode")}</Label>
          <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
        </div>
        <Button onClick={() => createMutation.mutate()} disabled={!form.name || !form.code || createMutation.isPending}>
          {t("school.settings.addBranch")}
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("school.settings.branchName")}</TableHead>
            <TableHead>{t("school.settings.branchCode")}</TableHead>
            <TableHead>{t("school.settings.board")}</TableHead>
            <TableHead>{t("school.settings.isActive")}</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {branches.map((branch) => (
            <TableRow key={branch.id}>
              <TableCell>{branch.name}</TableCell>
              <TableCell>{branch.code}</TableCell>
              <TableCell>{branch.board}</TableCell>
              <TableCell>
                <Badge variant={branch.isActive ? "default" : "secondary"}>{branch.isActive ? "Active" : "Inactive"}</Badge>
              </TableCell>
              <TableCell>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleActive.mutate({ id: branch.id, isActive: !branch.isActive })}
                >
                  {branch.isActive ? t("school.settings.deactivate") : t("school.settings.activate")}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function StaffRolesTab() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const branchId = getAdminBranchId() ?? "";
  const { data: usersData } = useQuery({
    queryKey: ["users", branchId],
    queryFn: () => adminApi.listUsers(branchId),
    enabled: !!branchId,
  });
  const { data: rolesData } = useQuery({ queryKey: ["roles"], queryFn: () => adminApi.listRoles() });
  const users = usersData?.data ?? [];
  const roles = rolesData?.data ?? [];
  const customRole = roles.find((r) => r.key === "CUSTOM");

  const [invite, setInvite] = useState({ name: "", email: "", role: "TEACHER" as (typeof STAFF_ROLE_OPTIONS)[number] });
  const [newRoleName, setNewRoleName] = useState("");
  const [rolePermissions, setRolePermissions] = useState<string[]>(customRole?.rolePermissions.map((p) => p.permissionKey) ?? []);

  const inviteMutation = useMutation({
    mutationFn: () => adminApi.inviteUser({ ...invite, branchId }),
    onSuccess: () => {
      setInvite({ name: "", email: "", role: "TEACHER" });
      void queryClient.invalidateQueries({ queryKey: ["users", branchId] });
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => adminApi.patchUser(id, { status }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["users", branchId] }),
  });

  const createRoleMutation = useMutation({
    mutationFn: () => adminApi.createRole({ name: newRoleName, permissions: [] }),
    onSuccess: () => {
      setNewRoleName("");
      void queryClient.invalidateQueries({ queryKey: ["roles"] });
    },
  });

  const savePermissionsMutation = useMutation({
    mutationFn: () => adminApi.patchRolePermissions(customRole!.id, rolePermissions),
    onSuccess: () => {
      toast.success(t("school.settings.saved") as string);
      void queryClient.invalidateQueries({ queryKey: ["roles"] });
    },
  });

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <h2 className="font-heading text-lg font-semibold text-text-primary">{t("school.settings.inviteStaff")}</h2>
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1.5">
            <Label>{t("school.students.name")}</Label>
            <Input value={invite.name} onChange={(e) => setInvite({ ...invite, name: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("school.settings.email")}</Label>
            <Input value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("school.settings.role")}</Label>
            <Select value={invite.role} onValueChange={(v) => setInvite({ ...invite, role: v as typeof invite.role })}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STAFF_ROLE_OPTIONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r === "CUSTOM" ? t("school.settings.customRole") : r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={() => inviteMutation.mutate()}
            disabled={!invite.name || !invite.email || !branchId || inviteMutation.isPending}
          >
            {t("school.settings.inviteStaff")}
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("school.students.name")}</TableHead>
              <TableHead>{t("school.settings.email")}</TableHead>
              <TableHead>{t("school.settings.role")}</TableHead>
              <TableHead>{t("school.settings.status")}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.userRoles.map((ur) => ur.role.name).join(", ")}</TableCell>
                <TableCell>
                  <Badge variant={user.status === "ACTIVE" ? "default" : "secondary"}>{user.status}</Badge>
                </TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      statusMutation.mutate({ id: user.id, status: user.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" })
                    }
                  >
                    {user.status === "ACTIVE" ? t("school.settings.deactivate") : t("school.settings.activate")}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-3 border-t border-border pt-6">
        <h2 className="font-heading text-lg font-semibold text-text-primary">{t("school.settings.customRole")}</h2>
        {!customRole ? (
          <div className="flex items-end gap-2">
            <div className="flex flex-col gap-1.5">
              <Label>{t("school.settings.roleName")}</Label>
              <Input value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} />
            </div>
            <Button onClick={() => createRoleMutation.mutate()} disabled={!newRoleName || createRoleMutation.isPending}>
              {t("school.settings.createCustomRole")}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium text-text-primary">{customRole.name}</p>
            <div className="grid max-w-2xl grid-cols-2 gap-1 sm:grid-cols-3">
              {PERMISSIONS.map((permission) => (
                <label key={permission} className="flex items-center gap-2 text-sm text-text-secondary">
                  <input
                    type="checkbox"
                    checked={rolePermissions.includes(permission)}
                    onChange={(e) =>
                      setRolePermissions((prev) =>
                        e.target.checked ? [...prev, permission] : prev.filter((p) => p !== permission)
                      )
                    }
                  />
                  {permission}
                </label>
              ))}
            </div>
            <Button
              className="w-fit"
              onClick={() => savePermissionsMutation.mutate()}
              disabled={savePermissionsMutation.isPending}
            >
              {t("school.settings.savePermissions")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function DataRequestsTab() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["data-deletion-requests"],
    queryFn: () => adminApi.listDataDeletionRequests(),
  });
  const requests = data?.data ?? [];

  const rejectMutation = useMutation({
    mutationFn: ({ id, reviewNote }: { id: string; reviewNote: string }) =>
      adminApi.rejectDataDeletionRequest(id, reviewNote),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["data-deletion-requests"] }),
  });
  const executeMutation = useMutation({
    mutationFn: (id: string) => adminApi.executeDataDeletionRequest(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["data-deletion-requests"] }),
  });

  function reject(id: string) {
    const reviewNote = window.prompt(t("school.settings.rejectReasonPrompt") as string);
    if (!reviewNote) return;
    rejectMutation.mutate({ id, reviewNote });
  }

  function execute(id: string) {
    if (!window.confirm(t("school.settings.executeConfirm") as string)) return;
    executeMutation.mutate(id);
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-text-secondary">{t("school.settings.dataRequestsHint")}</p>
      {isLoading ? (
        <p className="text-text-secondary">{t("school.common.loading")}</p>
      ) : requests.length === 0 ? (
        <p className="text-text-secondary">{t("school.settings.dataRequestsEmpty")}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("school.settings.reason")}</TableHead>
              <TableHead>{t("school.settings.status")}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.reason ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant={r.status === "PENDING" ? "secondary" : "default"}>{r.status}</Badge>
                </TableCell>
                <TableCell>
                  {r.status === "PENDING" ? (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => reject(r.id)}>
                        {t("school.settings.reject")}
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => execute(r.id)}>
                        {t("school.settings.execute")}
                      </Button>
                    </div>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-heading text-2xl font-semibold text-text-primary">{t("school.settings.title")}</h1>
      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">{t("school.settings.profileTab")}</TabsTrigger>
          <TabsTrigger value="branches">{t("school.settings.branchesTab")}</TabsTrigger>
          <TabsTrigger value="staff">{t("school.settings.staffTab")}</TabsTrigger>
          <TabsTrigger value="data-requests">{t("school.settings.dataRequestsTab")}</TabsTrigger>
        </TabsList>
        <TabsContent value="profile">
          <SchoolProfileTab />
        </TabsContent>
        <TabsContent value="branches">
          <BranchesTab />
        </TabsContent>
        <TabsContent value="staff">
          <StaffRolesTab />
        </TabsContent>
        <TabsContent value="data-requests">
          <DataRequestsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
