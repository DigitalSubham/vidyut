"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { adminApi, getAdminBranchId, setAdminBranchId } from "@/lib/admin-client";

/**
 * Was a raw text Input asking the admin to type a branch's internal CUID
 * by hand — this component's own prior comment cited "no GET /branches
 * endpoint for tenant staff yet" as the reason, but that's existed since
 * Unit 36 (adminApi.listBranches(), already used by the /settings page)
 * — the comment just never got revisited once the gap it named was closed.
 * A real admin has no way to know a branch's raw ID, which was silently
 * blocking every branch-scoped screen (Academic Structure, Electives,
 * Houses, Fees, ...) behind a field nobody could fill in correctly.
 */
export function BranchSelector() {
  const { t } = useTranslation();
  const [branchId, setBranchId] = useState("");

  const branchesQuery = useQuery({
    queryKey: ["branches"],
    queryFn: () => adminApi.listBranches(),
  });
  const branches = useMemo(() => branchesQuery.data?.data ?? [], [branchesQuery.data]);

  useEffect(() => {
    // localStorage is only readable client-side — same SSR-safe mount-read
    // pattern as app/(school)/layout.tsx's auth check.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBranchId(getAdminBranchId() ?? "");
  }, []);

  useEffect(() => {
    if (branchId || branches.length === 0) return;
    // Nothing selected yet (fresh login, or a stale id no longer in the
    // list) — default to the first branch instead of leaving every
    // branch-scoped screen silently empty until someone finds this picker.
    const fallback = branches[0]!.id;
    setAdminBranchId(fallback);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBranchId(fallback);
  }, [branchId, branches]);

  function handleChange(value: string) {
    setAdminBranchId(value);
    setBranchId(value);
  }

  if (branches.length === 0) return null;

  return (
    <Select value={branchId} onValueChange={handleChange}>
      <SelectTrigger className="w-48">
        <SelectValue placeholder={t("school.branchIdPlaceholder") as string} />
      </SelectTrigger>
      <SelectContent>
        {branches.map((b) => (
          <SelectItem key={b.id} value={b.id}>
            {b.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
