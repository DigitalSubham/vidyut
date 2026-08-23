"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { adminApi } from "@/lib/admin-client";

/**
 * Unit 69 scope #4 — hardcoded steps, no CMS content-management behind it
 * (the spec's own scope note). Shown once on first dashboard load, gated by
 * `User.hasSeenTour`.
 */
export function OnboardingTour() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    adminApi.getTourSeen().then((res) => {
      if (!res.data.hasSeenTour) setOpen(true);
    });
  }, []);

  const steps = [
    { title: t("school.tour.step1Title"), body: t("school.tour.step1Body") },
    { title: t("school.tour.step2Title"), body: t("school.tour.step2Body") },
    { title: t("school.tour.step3Title"), body: t("school.tour.step3Body") },
  ];

  function dismiss() {
    setOpen(false);
    void adminApi.markTourSeen();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && dismiss()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{steps[step]!.title}</DialogTitle>
          <DialogDescription>{steps[step]!.body}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          {step < steps.length - 1 ? (
            <Button onClick={() => setStep(step + 1)}>{t("school.tour.next")}</Button>
          ) : (
            <Button onClick={dismiss}>{t("school.tour.done")}</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
