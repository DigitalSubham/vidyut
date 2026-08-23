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

function CircularsTab() {
  const { t } = useTranslation();
  const branchId = getAdminBranchId() ?? "";
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [classIds, setClassIds] = useState("");
  const [acksCircularId, setAcksCircularId] = useState("");
  const [loadedAcksId, setLoadedAcksId] = useState("");

  const circularsQuery = useQuery({
    queryKey: ["circulars", branchId],
    queryFn: () => adminApi.listCirculars(branchId),
    enabled: !!branchId,
  });
  const acksQuery = useQuery({
    queryKey: ["circular-acks", loadedAcksId],
    queryFn: () => adminApi.listCircularAcks(loadedAcksId),
    enabled: !!loadedAcksId,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      adminApi.createCircular({
        branchId,
        title,
        body,
        ...(classIds ? { audience: { classIds: classIds.split(",").map((c) => c.trim()) } } : {}),
      }),
    onSuccess: () => {
      setTitle("");
      setBody("");
      setClassIds("");
      toast.success(t("school.engagement.circularCreated") as string);
      void queryClient.invalidateQueries({ queryKey: ["circulars", branchId] });
    },
  });

  const circulars = circularsQuery.data?.data ?? [];
  const acks = acksQuery.data?.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
        <h3 className="font-heading text-sm font-semibold text-text-primary">{t("school.engagement.newCircular")}</h3>
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1.5">
            <Label>{t("school.engagement.fieldTitle")}</Label>
            <Input className="max-w-xs" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("school.engagement.body")}</Label>
            <Input className="max-w-xs" value={body} onChange={(e) => setBody(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("school.engagement.classIdsOptional")}</Label>
            <Input className="max-w-xs" value={classIds} onChange={(e) => setClassIds(e.target.value)} />
          </div>
          <Button onClick={() => createMutation.mutate()} disabled={!title || !body}>
            {t("school.common.save")}
          </Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("school.engagement.fieldTitle")}</TableHead>
            <TableHead>{t("school.engagement.publishedAt")}</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {circulars.map((c) => (
            <TableRow key={c.id}>
              <TableCell className="font-medium">{c.title}</TableCell>
              <TableCell>{new Date(c.publishedAt).toLocaleDateString()}</TableCell>
              <TableCell>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setAcksCircularId(c.id);
                    setLoadedAcksId(c.id);
                  }}
                >
                  {t("school.engagement.viewAcks")}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {loadedAcksId ? (
        <div className="flex flex-col gap-2">
          <h3 className="font-heading text-sm font-semibold text-text-primary">
            {t("school.engagement.acksFor")} {acksCircularId}
          </h3>
          <p className="text-sm text-text-secondary">
            {t("school.engagement.ackCount")}: {acks.length}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function PTMSlotsTab() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [staffId, setStaffId] = useState("");
  const [loadedStaffId, setLoadedStaffId] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const slotsQuery = useQuery({
    queryKey: ["ptm-slots", loadedStaffId],
    queryFn: () => adminApi.listPTMSlots(loadedStaffId),
    enabled: !!loadedStaffId,
  });

  const createMutation = useMutation({
    mutationFn: () => adminApi.createPTMSlot({ startTime, endTime }),
    onSuccess: () => {
      setStartTime("");
      setEndTime("");
      toast.success(t("school.engagement.slotCreated") as string);
      void queryClient.invalidateQueries({ queryKey: ["ptm-slots", loadedStaffId] });
    },
  });

  const slots = slotsQuery.data?.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
        <h3 className="font-heading text-sm font-semibold text-text-primary">{t("school.engagement.offerSlot")}</h3>
        <p className="text-xs text-text-secondary">{t("school.engagement.offerSlotHelp")}</p>
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1.5">
            <Label>{t("school.engagement.startTime")}</Label>
            <Input
              type="datetime-local"
              className="max-w-xs"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("school.engagement.endTime")}</Label>
            <Input
              type="datetime-local"
              className="max-w-xs"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
          <Button onClick={() => createMutation.mutate()} disabled={!startTime || !endTime}>
            {t("school.common.save")}
          </Button>
        </div>
      </div>

      <div className="flex items-end gap-2">
        <div className="flex flex-col gap-1.5">
          <Label>{t("school.engagement.staffId")}</Label>
          <Input className="max-w-xs" value={staffId} onChange={(e) => setStaffId(e.target.value)} />
        </div>
        <Button variant="outline" onClick={() => setLoadedStaffId(staffId)}>
          {t("school.common.load")}
        </Button>
      </div>

      {slots.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("school.engagement.startTime")}</TableHead>
              <TableHead>{t("school.engagement.endTime")}</TableHead>
              <TableHead>{t("school.engagement.status")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {slots.map((s) => (
              <TableRow key={s.id}>
                <TableCell>{new Date(s.startTime).toLocaleString()}</TableCell>
                <TableCell>{new Date(s.endTime).toLocaleString()}</TableCell>
                <TableCell>
                  {s.bookedByGuardianId ? (
                    <Badge variant="secondary">{t("school.engagement.booked")}</Badge>
                  ) : (
                    <Badge>{t("school.engagement.available")}</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}
    </div>
  );
}

function CalendarTab() {
  const { t } = useTranslation();
  const branchId = getAdminBranchId() ?? "";
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [type, setType] = useState<"HOLIDAY" | "EVENT" | "OTHER">("EVENT");

  const eventsQuery = useQuery({
    queryKey: ["calendar-events", branchId],
    queryFn: () => adminApi.listCalendarEvents(branchId),
    enabled: !!branchId,
  });

  const createMutation = useMutation({
    mutationFn: () => adminApi.createCalendarEvent({ branchId, title, date, type }),
    onSuccess: () => {
      setTitle("");
      setDate("");
      toast.success(t("school.engagement.eventCreated") as string);
      void queryClient.invalidateQueries({ queryKey: ["calendar-events", branchId] });
    },
  });

  const events = eventsQuery.data?.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-2 rounded-lg border border-border p-4">
        <div className="flex flex-col gap-1.5">
          <Label>{t("school.engagement.fieldTitle")}</Label>
          <Input className="max-w-xs" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>{t("school.engagement.date")}</Label>
          <Input type="date" className="max-w-xs" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>{t("school.engagement.type")}</Label>
          <select
            className="rounded-md border border-border bg-bg-surface px-3 py-2 text-sm"
            value={type}
            onChange={(e) => setType(e.target.value as typeof type)}
          >
            <option value="EVENT">{t("school.engagement.typeEvent")}</option>
            <option value="HOLIDAY">{t("school.engagement.typeHoliday")}</option>
            <option value="OTHER">{t("school.engagement.typeOther")}</option>
          </select>
        </div>
        <Button onClick={() => createMutation.mutate()} disabled={!title || !date}>
          {t("school.common.save")}
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("school.engagement.date")}</TableHead>
            <TableHead>{t("school.engagement.fieldTitle")}</TableHead>
            <TableHead>{t("school.engagement.type")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map((e) => (
            <TableRow key={e.id}>
              <TableCell>{new Date(e.date).toLocaleDateString()}</TableCell>
              <TableCell>{e.title}</TableCell>
              <TableCell>{e.type}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function ComplaintsTab() {
  const { t } = useTranslation();
  const branchId = getAdminBranchId() ?? "";
  const queryClient = useQueryClient();
  const [resolutionDrafts, setResolutionDrafts] = useState<Record<string, string>>({});

  const complaintsQuery = useQuery({
    queryKey: ["complaints", branchId],
    queryFn: () => adminApi.listComplaints(branchId),
    enabled: !!branchId,
  });

  const resolveMutation = useMutation({
    mutationFn: ({ id, resolution }: { id: string; resolution: string }) => adminApi.resolveComplaint(id, resolution),
    onSuccess: () => {
      toast.success(t("school.engagement.complaintResolved") as string);
      void queryClient.invalidateQueries({ queryKey: ["complaints", branchId] });
    },
  });

  const complaints = complaintsQuery.data?.data ?? [];

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("school.engagement.category")}</TableHead>
          <TableHead>{t("school.engagement.body")}</TableHead>
          <TableHead>{t("school.engagement.status")}</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {complaints.map((c) => (
          <TableRow key={c.id}>
            <TableCell>{c.category}</TableCell>
            <TableCell>{c.body}</TableCell>
            <TableCell>
              <Badge variant={c.status === "RESOLVED" ? "default" : "secondary"}>{c.status}</Badge>
            </TableCell>
            <TableCell>
              {c.status === "OPEN" ? (
                <div className="flex gap-2">
                  <Input
                    className="h-8 max-w-xs"
                    placeholder={t("school.engagement.resolutionPlaceholder") as string}
                    value={resolutionDrafts[c.id] ?? ""}
                    onChange={(e) => setResolutionDrafts((prev) => ({ ...prev, [c.id]: e.target.value }))}
                  />
                  <Button
                    size="sm"
                    disabled={!resolutionDrafts[c.id]}
                    onClick={() => resolveMutation.mutate({ id: c.id, resolution: resolutionDrafts[c.id]! })}
                  >
                    {t("school.engagement.resolve")}
                  </Button>
                </div>
              ) : (
                c.resolution
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function SurveysTab() {
  const { t } = useTranslation();
  const branchId = getAdminBranchId() ?? "";
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [questionText, setQuestionText] = useState("");
  const [resultsId, setResultsId] = useState("");
  const [loadedResultsId, setLoadedResultsId] = useState("");

  const surveysQuery = useQuery({
    queryKey: ["surveys", branchId],
    queryFn: () => adminApi.listSurveys(branchId),
    enabled: !!branchId,
  });
  const resultsQuery = useQuery({
    queryKey: ["survey-results", loadedResultsId],
    queryFn: () => adminApi.getSurveyResults(loadedResultsId),
    enabled: !!loadedResultsId,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      adminApi.createSurvey({
        branchId,
        title,
        questions: [{ questionText, type: "TEXT", order: 0 }],
      }),
    onSuccess: () => {
      setTitle("");
      setQuestionText("");
      toast.success(t("school.engagement.surveyCreated") as string);
      void queryClient.invalidateQueries({ queryKey: ["surveys", branchId] });
    },
  });

  const surveys = surveysQuery.data?.data ?? [];
  const results = resultsQuery.data?.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
        <h3 className="font-heading text-sm font-semibold text-text-primary">{t("school.engagement.newSurvey")}</h3>
        <p className="text-xs text-text-secondary">{t("school.engagement.newSurveyHelp")}</p>
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1.5">
            <Label>{t("school.engagement.fieldTitle")}</Label>
            <Input className="max-w-xs" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("school.engagement.questionText")}</Label>
            <Input className="max-w-xs" value={questionText} onChange={(e) => setQuestionText(e.target.value)} />
          </div>
          <Button onClick={() => createMutation.mutate()} disabled={!title || !questionText}>
            {t("school.common.save")}
          </Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("school.engagement.fieldTitle")}</TableHead>
            <TableHead>{t("school.engagement.questionsCount")}</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {surveys.map((s) => (
            <TableRow key={s.id}>
              <TableCell className="font-medium">{s.title}</TableCell>
              <TableCell>{s.questions.length}</TableCell>
              <TableCell>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setResultsId(s.id);
                    setLoadedResultsId(s.id);
                  }}
                >
                  {t("school.engagement.viewResults")}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {loadedResultsId ? (
        <div className="flex flex-col gap-2">
          <h3 className="font-heading text-sm font-semibold text-text-primary">
            {t("school.engagement.resultsFor")} {resultsId}
          </h3>
          {results.map((r) => (
            <div key={r.questionId} className="rounded-lg border border-border p-3 text-sm">
              <p className="font-medium">{r.questionText}</p>
              {r.tally ? (
                <ul className="mt-1 list-disc pl-5">
                  {Object.entries(r.tally).map(([option, count]) => (
                    <li key={option}>
                      {option}: {count}
                    </li>
                  ))}
                </ul>
              ) : (
                <ul className="mt-1 list-disc pl-5">
                  {r.responses?.map((resp, i) => <li key={i}>{resp}</li>)}
                </ul>
              )}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function GalleryTab() {
  const { t } = useTranslation();
  const branchId = getAdminBranchId() ?? "";
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [selectedAlbumId, setSelectedAlbumId] = useState("");
  const [loadedAlbumId, setLoadedAlbumId] = useState("");

  const albumsQuery = useQuery({
    queryKey: ["gallery-albums", branchId],
    queryFn: () => adminApi.listGalleryAlbums(branchId),
    enabled: !!branchId,
  });
  const photosQuery = useQuery({
    queryKey: ["gallery-photos", loadedAlbumId],
    queryFn: () => adminApi.listGalleryPhotos(loadedAlbumId),
    enabled: !!loadedAlbumId,
  });

  const createAlbumMutation = useMutation({
    mutationFn: () => adminApi.createGalleryAlbum({ branchId, title, isPublic }),
    onSuccess: () => {
      setTitle("");
      setIsPublic(false);
      toast.success(t("school.engagement.albumCreated") as string);
      void queryClient.invalidateQueries({ queryKey: ["gallery-albums", branchId] });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const { data } = await adminApi.requestGalleryPhotoUpload(loadedAlbumId, {
        fileName: file.name,
        contentType: file.type,
      });
      await fetch(data.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      return data.photo;
    },
    onSuccess: () => {
      toast.success(t("school.engagement.photoUploaded") as string);
      void queryClient.invalidateQueries({ queryKey: ["gallery-photos", loadedAlbumId] });
    },
  });

  const albums = albumsQuery.data?.data ?? [];
  const photos = photosQuery.data?.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end gap-2 rounded-lg border border-border p-4">
        <div className="flex flex-col gap-1.5">
          <Label>{t("school.engagement.albumTitle")}</Label>
          <Input className="max-w-xs" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm text-text-secondary">
          <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
          {t("school.engagement.albumIsPublic")}
        </label>
        <Button onClick={() => createAlbumMutation.mutate()} disabled={!title}>
          {t("school.common.save")}
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("school.engagement.albumTitle")}</TableHead>
            <TableHead />
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {albums.map((a) => (
            <TableRow key={a.id}>
              <TableCell className="font-medium">{a.title}</TableCell>
              <TableCell>
                {a.isPublic ? <Badge>{t("school.engagement.albumIsPublic")}</Badge> : null}
              </TableCell>
              <TableCell>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedAlbumId(a.id);
                    setLoadedAlbumId(a.id);
                  }}
                >
                  {t("school.engagement.viewPhotos")}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {loadedAlbumId ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <h3 className="font-heading text-sm font-semibold text-text-primary">
              {t("school.engagement.photosFor")} {selectedAlbumId}
            </h3>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadMutation.mutate(file);
              }}
            />
          </div>
          <div className="grid grid-cols-4 gap-3">
            {photos.map((p) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={p.id} src={p.url} alt={p.caption ?? ""} className="aspect-square rounded-lg object-cover" />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function EngagementPage() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-heading text-2xl font-semibold text-text-primary">{t("school.engagement.title")}</h1>
      <Tabs defaultValue="circulars">
        <TabsList>
          <TabsTrigger value="circulars">{t("school.engagement.circularsTab")}</TabsTrigger>
          <TabsTrigger value="ptm">{t("school.engagement.ptmTab")}</TabsTrigger>
          <TabsTrigger value="calendar">{t("school.engagement.calendarTab")}</TabsTrigger>
          <TabsTrigger value="complaints">{t("school.engagement.complaintsTab")}</TabsTrigger>
          <TabsTrigger value="surveys">{t("school.engagement.surveysTab")}</TabsTrigger>
          <TabsTrigger value="gallery">{t("school.engagement.galleryTab")}</TabsTrigger>
        </TabsList>
        <TabsContent value="circulars">
          <CircularsTab />
        </TabsContent>
        <TabsContent value="ptm">
          <PTMSlotsTab />
        </TabsContent>
        <TabsContent value="calendar">
          <CalendarTab />
        </TabsContent>
        <TabsContent value="complaints">
          <ComplaintsTab />
        </TabsContent>
        <TabsContent value="surveys">
          <SurveysTab />
        </TabsContent>
        <TabsContent value="gallery">
          <GalleryTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
