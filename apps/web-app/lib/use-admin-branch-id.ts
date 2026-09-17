"use client";

import { useEffect, useState } from "react";
import { getAdminBranchId, BRANCH_CHANGE_EVENT } from "./admin-client";

/**
 * Live-updating branchId, unlike a plain `getAdminBranchId() ?? ""` read
 * (still fine for a one-off, e.g. inside a click handler) — that only
 * reflects localStorage at whatever moment the calling component happens
 * to render, so BranchSelector picking (or auto-selecting) a branch is
 * invisible to any *already-mounted* screen until something else forces a
 * re-render. Also picks up changes from another tab (the native `storage`
 * event, which — unlike our own dispatched one — only ever fires cross-tab).
 */
export function useAdminBranchId(): string {
  const [branchId, setBranchId] = useState("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBranchId(getAdminBranchId() ?? "");

    const onChange = () => setBranchId(getAdminBranchId() ?? "");
    window.addEventListener(BRANCH_CHANGE_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(BRANCH_CHANGE_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  return branchId;
}
