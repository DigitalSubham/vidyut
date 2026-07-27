"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { getAdminBranchId, setAdminBranchId } from "@/lib/admin-client";

/**
 * Unit 27's deliberate simplification: no `GET /branches` endpoint exists
 * for tenant staff yet (Branch is only super-admin-managed today) — the
 * same "manual entry, documented gap" precedent Unit 16 used for
 * section/branch before Unit 26 built a real picker. A real branch switcher
 * is fast-follow work once that endpoint exists.
 */
export function BranchSelector() {
  const { t } = useTranslation();
  const [branchId, setBranchId] = useState("");

  useEffect(() => {
    // localStorage is only readable client-side — same SSR-safe mount-read
    // pattern as app/(school)/layout.tsx's auth check.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBranchId(getAdminBranchId() ?? "");
  }, []);

  return (
    <Input
      className="w-48"
      placeholder={t("school.branchIdPlaceholder") as string}
      value={branchId}
      onChange={(e) => {
        setBranchId(e.target.value);
        setAdminBranchId(e.target.value);
      }}
    />
  );
}
