"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminApi, getAdminBranchId } from "@/lib/admin-client";

const CERTIFICATE_TYPES = ["TC", "BONAFIDE", "CHARACTER", "CONDUCT", "ID_CARD", "ADMIT_CARD", "CUSTOM"] as const;

function TemplatesTab() {
  const { t } = useTranslation();
  const branchId = getAdminBranchId() ?? "";
  const queryClient = useQueryClient();
  const [type, setType] = useState<(typeof CERTIFICATE_TYPES)[number]>("BONAFIDE");
  const [name, setName] = useState("");
  const [body, setBody] = useState("");

  const templatesQuery = useQuery({
    queryKey: ["certificate-templates", branchId],
    queryFn: () => adminApi.listCertificateTemplates(branchId),
    enabled: !!branchId,
  });

  const createMutation = useMutation({
    mutationFn: () => adminApi.createCertificateTemplate({ branchId, type, name, body }),
    onSuccess: () => {
      setName("");
      setBody("");
      toast.success(t("school.certificates.templateCreated") as string);
      void queryClient.invalidateQueries({ queryKey: ["certificate-templates", branchId] });
    },
  });

  const templates = templatesQuery.data?.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
        <h3 className="font-heading text-sm font-semibold text-text-primary">{t("school.certificates.newTemplate")}</h3>
        <p className="text-xs text-text-secondary">{t("school.certificates.tokenHelp")}</p>
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1.5">
            <Label>{t("school.certificates.type")}</Label>
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={type}
              onChange={(e) => setType(e.target.value as (typeof CERTIFICATE_TYPES)[number])}
            >
              {CERTIFICATE_TYPES.map((ct) => (
                <option key={ct} value={ct}>
                  {ct}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("school.certificates.fieldName")}</Label>
            <Input className="max-w-xs" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>{t("school.certificates.body")}</Label>
          <Textarea
            rows={4}
            placeholder="Dear {{studentName}}, this certifies that {{studentName}} of class {{className}} was issued on {{issueDate}}."
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </div>
        <Button className="w-fit" onClick={() => createMutation.mutate()} disabled={!name || !body}>
          {t("school.common.save")}
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("school.certificates.fieldName")}</TableHead>
            <TableHead>{t("school.certificates.type")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {templates.map((tpl) => (
            <TableRow key={tpl.id}>
              <TableCell className="font-medium">{tpl.name}</TableCell>
              <TableCell>
                <Badge variant="outline">{tpl.type}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function BulkIdsTab() {
  const { t } = useTranslation();
  const branchId = getAdminBranchId() ?? "";
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [generated, setGenerated] = useState<Awaited<ReturnType<typeof adminApi.generateBulkIds>>["data"]>([]);

  const classesQuery = useQuery({
    queryKey: ["classes", branchId],
    queryFn: () => adminApi.listClasses(branchId),
    enabled: !!branchId,
  });
  const sectionsQuery = useQuery({
    queryKey: ["sections", classId],
    queryFn: () => adminApi.listSections(classId),
    enabled: !!classId,
  });

  const generateMutation = useMutation({
    mutationFn: () => adminApi.generateBulkIds(sectionId),
    onSuccess: (res) => {
      setGenerated(res.data);
      toast.success(t("school.certificates.bulkIdsGenerated", { count: res.data.length }) as string);
    },
  });

  const classes = classesQuery.data?.data ?? [];
  const sections = sectionsQuery.data?.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
        <h3 className="font-heading text-sm font-semibold text-text-primary">{t("school.certificates.bulkIds")}</h3>
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1.5">
            <Label>{t("school.certificates.class")}</Label>
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={classId}
              onChange={(e) => {
                setClassId(e.target.value);
                setSectionId("");
              }}
            >
              <option value="">{t("school.common.select")}</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("school.certificates.section")}</Label>
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={sectionId}
              onChange={(e) => setSectionId(e.target.value)}
              disabled={!classId}
            >
              <option value="">{t("school.common.select")}</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <Button onClick={() => generateMutation.mutate()} disabled={!sectionId}>
            {t("school.certificates.generate")}
          </Button>
        </div>
      </div>

      {generated.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("school.certificates.number")}</TableHead>
              <TableHead>{t("school.certificates.status")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {generated.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.number}</TableCell>
                <TableCell>
                  <Badge variant="outline">{c.signatureStatus}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}
    </div>
  );
}

function RegisterTab() {
  const { t } = useTranslation();
  const branchId = getAdminBranchId() ?? "";
  const queryClient = useQueryClient();
  const [studentId, setStudentId] = useState("");
  const [type, setType] = useState<(typeof CERTIFICATE_TYPES)[number]>("TC");
  const [customTitle, setCustomTitle] = useState("");

  const listQuery = useQuery({
    queryKey: ["certificates", branchId],
    queryFn: () => adminApi.listCertificates(branchId),
    enabled: !!branchId,
  });

  const issueMutation = useMutation({
    mutationFn: () =>
      adminApi.issueCertificate({
        studentId,
        type,
        ...(type === "CUSTOM" ? { customTitle } : {}),
      }),
    onSuccess: () => {
      setStudentId("");
      toast.success(t("school.certificates.issued") as string);
      void queryClient.invalidateQueries({ queryKey: ["certificates", branchId] });
    },
  });

  const signMutation = useMutation({
    mutationFn: (id: string) => adminApi.requestCertificateSignature(id),
    onSuccess: () => {
      toast.success(t("school.certificates.signatureRequested") as string);
      void queryClient.invalidateQueries({ queryKey: ["certificates", branchId] });
    },
  });

  const certificates = listQuery.data?.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
        <h3 className="font-heading text-sm font-semibold text-text-primary">{t("school.certificates.issueNew")}</h3>
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1.5">
            <Label>{t("school.certificates.studentId")}</Label>
            <Input className="max-w-xs" value={studentId} onChange={(e) => setStudentId(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("school.certificates.type")}</Label>
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={type}
              onChange={(e) => setType(e.target.value as (typeof CERTIFICATE_TYPES)[number])}
            >
              {CERTIFICATE_TYPES.map((ct) => (
                <option key={ct} value={ct}>
                  {ct}
                </option>
              ))}
            </select>
          </div>
          {type === "CUSTOM" ? (
            <div className="flex flex-col gap-1.5">
              <Label>{t("school.certificates.customTitle")}</Label>
              <Input className="max-w-xs" value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} />
            </div>
          ) : null}
          <Button onClick={() => issueMutation.mutate()} disabled={!studentId}>
            {t("school.certificates.issue")}
          </Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("school.certificates.number")}</TableHead>
            <TableHead>{t("school.certificates.type")}</TableHead>
            <TableHead>{t("school.certificates.status")}</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {certificates.map((c) => (
            <TableRow key={c.id}>
              <TableCell className="font-medium">{c.number}</TableCell>
              <TableCell>{c.type}</TableCell>
              <TableCell>
                <Badge variant="outline">{c.signatureStatus}</Badge>
              </TableCell>
              <TableCell className="flex gap-2">
                {c.signatureStatus === "NONE" ? (
                  <Button variant="outline" size="sm" onClick={() => signMutation.mutate(c.id)}>
                    {t("school.certificates.requestSignature")}
                  </Button>
                ) : null}
                {c.downloadUrl ? (
                  <Button variant="outline" size="sm" asChild>
                    <a href={c.downloadUrl} target="_blank" rel="noreferrer">
                      {t("school.certificates.downloadPdf")}
                    </a>
                  </Button>
                ) : null}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function DocumentsTab() {
  const { t } = useTranslation();
  const branchId = getAdminBranchId() ?? "";
  const queryClient = useQueryClient();
  const [ownerType, setOwnerType] = useState<"STUDENT" | "STAFF">("STUDENT");
  const [ownerId, setOwnerId] = useState("");
  const [label, setLabel] = useState("");
  const [tags, setTags] = useState("");

  const listQuery = useQuery({
    queryKey: ["documents", branchId],
    queryFn: () => adminApi.listDocuments(branchId),
    enabled: !!branchId,
  });

  const uploadMutation = useMutation({
    mutationFn: () =>
      adminApi.requestDocumentUpload({
        branchId,
        ownerType,
        ownerId,
        label,
        fileName: `${label || "document"}.pdf`,
        contentType: "application/pdf",
        ...(tags ? { tags: tags.split(",").map((tg) => tg.trim()) } : {}),
      }),
    onSuccess: () => {
      setOwnerId("");
      setLabel("");
      setTags("");
      toast.success(t("school.certificates.documentRegistered") as string);
      void queryClient.invalidateQueries({ queryKey: ["documents", branchId] });
    },
  });

  const documents = listQuery.data?.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
        <h3 className="font-heading text-sm font-semibold text-text-primary">{t("school.certificates.newDocument")}</h3>
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1.5">
            <Label>{t("school.certificates.ownerType")}</Label>
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={ownerType}
              onChange={(e) => setOwnerType(e.target.value as "STUDENT" | "STAFF")}
            >
              <option value="STUDENT">STUDENT</option>
              <option value="STAFF">STAFF</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("school.certificates.ownerId")}</Label>
            <Input className="max-w-xs" value={ownerId} onChange={(e) => setOwnerId(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("school.certificates.fieldLabel")}</Label>
            <Input className="max-w-xs" value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("school.certificates.tags")}</Label>
            <Input className="max-w-xs" placeholder="identity, admission" value={tags} onChange={(e) => setTags(e.target.value)} />
          </div>
          <Button onClick={() => uploadMutation.mutate()} disabled={!ownerId || !label}>
            {t("school.common.save")}
          </Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("school.certificates.fieldLabel")}</TableHead>
            <TableHead>{t("school.certificates.ownerType")}</TableHead>
            <TableHead>{t("school.certificates.tags")}</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((doc) => (
            <TableRow key={doc.id}>
              <TableCell className="font-medium">{doc.label}</TableCell>
              <TableCell>{doc.ownerType}</TableCell>
              <TableCell>{doc.tags.join(", ")}</TableCell>
              <TableCell>
                <a href={doc.downloadUrl} target="_blank" rel="noreferrer" className="text-sm text-primary underline">
                  {t("school.certificates.download")}
                </a>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default function CertificatesPage() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="font-heading text-xl font-semibold text-text-primary">{t("school.certificates.title")}</h1>
      <Tabs defaultValue="register">
        <TabsList>
          <TabsTrigger value="register">{t("school.certificates.registerTab")}</TabsTrigger>
          <TabsTrigger value="templates">{t("school.certificates.templatesTab")}</TabsTrigger>
          <TabsTrigger value="bulk-ids">{t("school.certificates.bulkIdsTab")}</TabsTrigger>
          <TabsTrigger value="documents">{t("school.certificates.documentsTab")}</TabsTrigger>
        </TabsList>
        <TabsContent value="register">
          <RegisterTab />
        </TabsContent>
        <TabsContent value="templates">
          <TemplatesTab />
        </TabsContent>
        <TabsContent value="bulk-ids">
          <BulkIdsTab />
        </TabsContent>
        <TabsContent value="documents">
          <DocumentsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
