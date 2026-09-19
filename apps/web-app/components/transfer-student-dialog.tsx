"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { adminApi, type BranchItem, type ClassItem, type SectionItem } from "@/lib/admin-client";
import { getErrorMessage } from "@/lib/error-message";

export function TransferStudentDialog({
  studentId,
  open,
  onOpenChange,
  onTransferred,
}: {
  studentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTransferred?: () => void;
}) {
  const { t } = useTranslation();
  const [branches, setBranches] = useState<BranchItem[]>([]);
  const [targetBranchId, setTargetBranchId] = useState("");
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [targetClassId, setTargetClassId] = useState("");
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [targetSectionId, setTargetSectionId] = useState("");
  const [transferring, setTransferring] = useState(false);

  useEffect(() => {
    if (!open) return;
    adminApi.listBranches().then((res) => setBranches(res.data));
  }, [open]);

  useEffect(() => {
    if (!targetBranchId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setClasses([]);
      return;
    }
    adminApi.listClasses(targetBranchId).then((res) => setClasses(res.data));
  }, [targetBranchId]);

  useEffect(() => {
    if (!targetClassId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSections([]);
      return;
    }
    adminApi.listSections(targetClassId).then((res) => setSections(res.data));
  }, [targetClassId]);

  async function handleTransfer() {
    if (!targetBranchId || !targetClassId || !targetSectionId) return;
    setTransferring(true);
    try {
      await adminApi.transferStudent(studentId, { targetBranchId, targetClassId, targetSectionId });
      toast.success(t("school.students.lifecycle.transferred") as string);
      setTargetBranchId("");
      setTargetClassId("");
      setTargetSectionId("");
      onOpenChange(false);
      onTransferred?.();
    } catch (err) {
      const { title, description } = getErrorMessage(err);
      toast.error(title, { description });
    } finally {
      setTransferring(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("school.students.lifecycle.transfer")}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>{t("school.students.lifecycle.targetBranch")}</Label>
            <Select value={targetBranchId} onValueChange={setTargetBranchId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("school.common.select") as string} />
              </SelectTrigger>
              <SelectContent>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("school.students.class")}</Label>
            <Select value={targetClassId} onValueChange={setTargetClassId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("school.common.select") as string} />
              </SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("school.students.section")}</Label>
            <Select value={targetSectionId} onValueChange={setTargetSectionId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("school.common.select") as string} />
              </SelectTrigger>
              <SelectContent>
                {sections.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={handleTransfer}
            disabled={!targetBranchId || !targetClassId || !targetSectionId || transferring}
          >
            {transferring ? t("school.common.loading") : t("school.students.lifecycle.transfer")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
