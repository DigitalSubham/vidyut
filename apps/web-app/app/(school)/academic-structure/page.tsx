"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminApi, getAdminBranchId } from "@/lib/admin-client";

function ElectivesTab() {
  const { t } = useTranslation();
  const branchId = getAdminBranchId() ?? "";
  const queryClient = useQueryClient();
  const [classId, setClassId] = useState("");
  const [loadedClassId, setLoadedClassId] = useState("");
  const [groupName, setGroupName] = useState("");
  const [optionGroupId, setOptionGroupId] = useState("");
  const [classSubjectId, setClassSubjectId] = useState("");
  const [chooseStudentId, setChooseStudentId] = useState("");
  const [chooseSubjectId, setChooseSubjectId] = useState("");

  const groupsQuery = useQuery({
    queryKey: ["elective-groups", loadedClassId],
    queryFn: () => adminApi.listElectiveGroups(loadedClassId),
    enabled: !!loadedClassId,
  });

  const createGroupMutation = useMutation({
    mutationFn: () => adminApi.createElectiveGroup({ branchId, classId, name: groupName }),
    onSuccess: () => {
      setGroupName("");
      void queryClient.invalidateQueries({ queryKey: ["elective-groups", loadedClassId] });
      toast.success(t("school.academicStructure.basketCreated") as string);
    },
  });

  const addOptionMutation = useMutation({
    mutationFn: () => adminApi.addElectiveOption(optionGroupId, classSubjectId),
    onSuccess: () => {
      setClassSubjectId("");
      void queryClient.invalidateQueries({ queryKey: ["elective-groups", loadedClassId] });
      toast.success(t("school.academicStructure.optionAdded") as string);
    },
  });

  const chooseMutation = useMutation({
    mutationFn: () => adminApi.chooseElective(optionGroupId, chooseStudentId, chooseSubjectId),
    onSuccess: () => {
      toast.success(t("school.academicStructure.choiceSaved") as string);
    },
  });

  const groups = groupsQuery.data?.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end gap-2">
        <div className="flex flex-col gap-1.5">
          <Label>{t("school.academicStructure.classId")}</Label>
          <Input className="max-w-xs" value={classId} onChange={(e) => setClassId(e.target.value)} />
        </div>
        <Button variant="outline" onClick={() => setLoadedClassId(classId)}>
          {t("school.common.load")}
        </Button>
      </div>

      <div className="flex items-end gap-2">
        <div className="flex flex-col gap-1.5">
          <Label>{t("school.academicStructure.basketName")}</Label>
          <Input className="max-w-xs" value={groupName} onChange={(e) => setGroupName(e.target.value)} />
        </div>
        <Button onClick={() => createGroupMutation.mutate()} disabled={!classId || !groupName}>
          {t("school.academicStructure.createBasket")}
        </Button>
      </div>

      {groups.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("school.academicStructure.basketName")}</TableHead>
              <TableHead>{t("school.academicStructure.optionsCount")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.map((g) => (
              <TableRow key={g.id}>
                <TableCell>{g.name}</TableCell>
                <TableCell>{g.options.length}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}

      <div className="flex flex-col gap-2 rounded-lg border border-border p-4">
        <h3 className="font-heading text-sm font-semibold text-text-primary">
          {t("school.academicStructure.addOption")}
        </h3>
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1.5">
            <Label>{t("school.academicStructure.basketId")}</Label>
            <Input className="max-w-xs" value={optionGroupId} onChange={(e) => setOptionGroupId(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("school.academicStructure.classSubjectId")}</Label>
            <Input className="max-w-xs" value={classSubjectId} onChange={(e) => setClassSubjectId(e.target.value)} />
          </div>
          <Button onClick={() => addOptionMutation.mutate()} disabled={!optionGroupId || !classSubjectId}>
            {t("school.common.save")}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-border p-4">
        <h3 className="font-heading text-sm font-semibold text-text-primary">
          {t("school.academicStructure.studentChoice")}
        </h3>
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1.5">
            <Label>{t("school.academicStructure.basketId")}</Label>
            <Input className="max-w-xs" value={optionGroupId} onChange={(e) => setOptionGroupId(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("school.academicStructure.studentId")}</Label>
            <Input className="max-w-xs" value={chooseStudentId} onChange={(e) => setChooseStudentId(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("school.academicStructure.classSubjectId")}</Label>
            <Input className="max-w-xs" value={chooseSubjectId} onChange={(e) => setChooseSubjectId(e.target.value)} />
          </div>
          <Button onClick={() => chooseMutation.mutate()} disabled={!optionGroupId || !chooseStudentId || !chooseSubjectId}>
            {t("school.common.save")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function HousesTab() {
  const { t } = useTranslation();
  const branchId = getAdminBranchId() ?? "";
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [color, setColor] = useState("");
  const [rosterHouseId, setRosterHouseId] = useState("");
  const [loadedRosterHouseId, setLoadedRosterHouseId] = useState("");

  const housesQuery = useQuery({
    queryKey: ["houses", branchId],
    queryFn: () => adminApi.listHouses(branchId),
    enabled: !!branchId,
  });
  const rosterQuery = useQuery({
    queryKey: ["house-roster", loadedRosterHouseId],
    queryFn: () => adminApi.getHouseRoster(loadedRosterHouseId),
    enabled: !!loadedRosterHouseId,
  });

  const createMutation = useMutation({
    mutationFn: () => adminApi.createHouse({ branchId, name, color: color || undefined }),
    onSuccess: () => {
      setName("");
      setColor("");
      void queryClient.invalidateQueries({ queryKey: ["houses", branchId] });
    },
  });

  const houses = housesQuery.data?.data ?? [];
  const roster = rosterQuery.data?.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end gap-2">
        <div className="flex flex-col gap-1.5">
          <Label>{t("school.academicStructure.houseName")}</Label>
          <Input className="max-w-xs" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>{t("school.academicStructure.houseColor")}</Label>
          <Input className="max-w-xs" value={color} onChange={(e) => setColor(e.target.value)} placeholder="#ff0000" />
        </div>
        <Button onClick={() => createMutation.mutate()} disabled={!name}>
          {t("school.common.save")}
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("school.academicStructure.houseName")}</TableHead>
            <TableHead>{t("school.academicStructure.houseColor")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {houses.map((h) => (
            <TableRow key={h.id}>
              <TableCell>{h.name}</TableCell>
              <TableCell>{h.color ? <Badge style={{ backgroundColor: h.color }}>{h.color}</Badge> : "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex items-end gap-2">
        <div className="flex flex-col gap-1.5">
          <Label>{t("school.academicStructure.houseId")}</Label>
          <Input className="max-w-xs" value={rosterHouseId} onChange={(e) => setRosterHouseId(e.target.value)} />
        </div>
        <Button variant="outline" onClick={() => setLoadedRosterHouseId(rosterHouseId)}>
          {t("school.academicStructure.viewRoster")}
        </Button>
      </div>

      {roster.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("school.students.name")}</TableHead>
              <TableHead>{t("school.academicStructure.admissionNo")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roster.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  {r.firstName} {r.lastName}
                </TableCell>
                <TableCell>{r.admissionNo}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}
    </div>
  );
}

export default function AcademicStructurePage() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-heading text-2xl font-semibold text-text-primary">
        {t("school.academicStructure.title")}
      </h1>
      <Tabs defaultValue="electives">
        <TabsList>
          <TabsTrigger value="electives">{t("school.academicStructure.electivesTab")}</TabsTrigger>
          <TabsTrigger value="houses">{t("school.academicStructure.housesTab")}</TabsTrigger>
        </TabsList>
        <TabsContent value="electives">
          <ElectivesTab />
        </TabsContent>
        <TabsContent value="houses">
          <HousesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
