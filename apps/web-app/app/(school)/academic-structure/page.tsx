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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { adminApi, type SubjectType } from "@/lib/admin-client";
import { useAdminBranchId } from "@/lib/use-admin-branch-id";

const SUBJECT_TYPES: SubjectType[] = ["CORE", "ELECTIVE", "CO_SCHOLASTIC", "PRACTICAL"];

function ClassSectionsManager({ classId }: { classId: string }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState("");

  const sectionsQuery = useQuery({
    queryKey: ["sections", classId],
    queryFn: () => adminApi.listSections(classId),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      adminApi.createSection(classId, { name, capacity: capacity ? Number(capacity) : undefined }),
    onSuccess: () => {
      setName("");
      setCapacity("");
      void queryClient.invalidateQueries({ queryKey: ["sections", classId] });
      toast.success(t("school.academicStructure.sectionCreated") as string);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteSection(classId, id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["sections", classId] }),
  });

  const sections = sectionsQuery.data?.data ?? [];

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-bg-subtle p-4">
      <h4 className="font-heading text-sm font-semibold text-text-primary">
        {t("school.academicStructure.sectionsHeading")}
      </h4>
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1.5">
          <Label>{t("school.academicStructure.sectionName")}</Label>
          <Input className="max-w-40" value={name} onChange={(e) => setName(e.target.value)} placeholder="A" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>{t("school.academicStructure.sectionCapacity")}</Label>
          <Input
            className="max-w-32"
            type="number"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
          />
        </div>
        <Button size="sm" onClick={() => createMutation.mutate()} disabled={!name}>
          {t("school.academicStructure.createSection")}
        </Button>
      </div>

      {sections.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("school.academicStructure.sectionName")}</TableHead>
              <TableHead>{t("school.academicStructure.sectionCapacity")}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sections.map((s) => (
              <TableRow key={s.id}>
                <TableCell>{s.name}</TableCell>
                <TableCell>{s.capacity ?? "—"}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(s.id)}>
                    {t("school.common.delete")}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <p className="text-sm text-text-secondary">{t("school.academicStructure.noSections")}</p>
      )}
    </div>
  );
}

function ClassesTab() {
  const { t } = useTranslation();
  const branchId = useAdminBranchId();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [order, setOrder] = useState("");
  const [managedClassId, setManagedClassId] = useState("");

  const classesQuery = useQuery({
    queryKey: ["classes", branchId],
    queryFn: () => adminApi.listClasses(branchId),
    enabled: !!branchId,
  });

  const createMutation = useMutation({
    mutationFn: () => adminApi.createClass({ branchId, name, order: Number(order) }),
    onSuccess: () => {
      setName("");
      setOrder("");
      void queryClient.invalidateQueries({ queryKey: ["classes", branchId] });
      toast.success(t("school.academicStructure.classCreated") as string);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteClass(id),
    onSuccess: () => {
      setManagedClassId("");
      void queryClient.invalidateQueries({ queryKey: ["classes", branchId] });
    },
  });

  const classes = [...(classesQuery.data?.data ?? [])].sort((a, b) => a.order - b.order);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1.5">
          <Label>{t("school.academicStructure.className")}</Label>
          <Input
            className="max-w-xs"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("school.academicStructure.classNamePlaceholder") as string}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>{t("school.academicStructure.classOrder")}</Label>
          <Input className="max-w-24" type="number" value={order} onChange={(e) => setOrder(e.target.value)} />
        </div>
        <Button onClick={() => createMutation.mutate()} disabled={!name || !order}>
          {t("school.academicStructure.createClass")}
        </Button>
      </div>

      {classes.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("school.academicStructure.className")}</TableHead>
              <TableHead>{t("school.academicStructure.classOrder")}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {classes.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell>{c.order}</TableCell>
                <TableCell className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setManagedClassId(c.id)}>
                    {t("school.academicStructure.manageSections")}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(c.id)}>
                    {t("school.common.delete")}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <p className="text-sm text-text-secondary">{t("school.academicStructure.noClasses")}</p>
      )}

      {managedClassId ? <ClassSectionsManager classId={managedClassId} /> : null}
    </div>
  );
}

function SubjectsTab() {
  const { t } = useTranslation();
  const branchId = useAdminBranchId();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [type, setType] = useState<SubjectType>("CORE");

  const subjectsQuery = useQuery({
    queryKey: ["subjects", branchId],
    queryFn: () => adminApi.listSubjects(branchId),
    enabled: !!branchId,
  });

  const createMutation = useMutation({
    mutationFn: () => adminApi.createSubject({ branchId, name, code, type }),
    onSuccess: () => {
      setName("");
      setCode("");
      setType("CORE");
      void queryClient.invalidateQueries({ queryKey: ["subjects", branchId] });
      toast.success(t("school.academicStructure.subjectCreated") as string);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteSubject(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["subjects", branchId] }),
  });

  const subjects = subjectsQuery.data?.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1.5">
          <Label>{t("school.academicStructure.subjectName")}</Label>
          <Input
            className="max-w-xs"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("school.academicStructure.subjectNamePlaceholder") as string}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>{t("school.academicStructure.subjectCode")}</Label>
          <Input className="max-w-32" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="MATH" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>{t("school.academicStructure.subjectType")}</Label>
          <Select value={type} onValueChange={(v) => setType(v as SubjectType)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUBJECT_TYPES.map((st) => (
                <SelectItem key={st} value={st}>
                  {t(`school.academicStructure.subjectTypes.${st}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => createMutation.mutate()} disabled={!name || !code}>
          {t("school.academicStructure.createSubject")}
        </Button>
      </div>

      {subjects.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("school.academicStructure.subjectName")}</TableHead>
              <TableHead>{t("school.academicStructure.subjectCode")}</TableHead>
              <TableHead>{t("school.academicStructure.subjectType")}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {subjects.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell>{s.code}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{t(`school.academicStructure.subjectTypes.${s.type}`)}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(s.id)}>
                    {t("school.common.delete")}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <p className="text-sm text-text-secondary">{t("school.academicStructure.noSubjects")}</p>
      )}
    </div>
  );
}

function ElectivesTab() {
  const { t } = useTranslation();
  const branchId = useAdminBranchId();
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
  const branchId = useAdminBranchId();
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
      <Tabs defaultValue="classes">
        <TabsList>
          <TabsTrigger value="classes">{t("school.academicStructure.classesTab")}</TabsTrigger>
          <TabsTrigger value="subjects">{t("school.academicStructure.subjectsTab")}</TabsTrigger>
          <TabsTrigger value="electives">{t("school.academicStructure.electivesTab")}</TabsTrigger>
          <TabsTrigger value="houses">{t("school.academicStructure.housesTab")}</TabsTrigger>
        </TabsList>
        <TabsContent value="classes">
          <ClassesTab />
        </TabsContent>
        <TabsContent value="subjects">
          <SubjectsTab />
        </TabsContent>
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
