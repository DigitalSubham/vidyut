"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { adminApi, getAdminBranchId } from "@/lib/admin-client";

/** Unit 37 — a "jump to record" dropdown, not a search results page (per this unit's own Out of scope). */
export function GlobalSearch() {
  const { t } = useTranslation();
  const router = useRouter();
  const branchId = getAdminBranchId() ?? "";
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data } = useQuery({
    queryKey: ["search", branchId, q],
    queryFn: () => adminApi.search(branchId, q),
    enabled: !!branchId && q.trim().length > 0,
  });
  const results = data?.data;
  const hasResults =
    !!results && (results.students.length > 0 || results.staff.length > 0 || results.invoices.length > 0);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function go(href: string) {
    setOpen(false);
    setQ("");
    router.push(href);
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-xs">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
        <Input
          className="pl-8"
          placeholder={t("topbar.searchPlaceholder") as string}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
        />
      </div>
      {open && q.trim().length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-bg-surface p-2 shadow-lg">
          {!hasResults ? (
            <p className="px-2 py-1.5 text-sm text-text-secondary">{t("topbar.searchEmpty")}</p>
          ) : (
            <div className="flex flex-col gap-1">
              {results!.students.map((s) => (
                <button
                  key={s.id}
                  className="rounded px-2 py-1.5 text-left text-sm hover:bg-bg-elevated"
                  onClick={() => go(`/students/${s.id}`)}
                >
                  {s.name} <span className="text-text-secondary">· {s.admissionNo}</span>
                </button>
              ))}
              {results!.staff.map((s) => (
                <div key={s.id} className="rounded px-2 py-1.5 text-left text-sm text-text-secondary">
                  {s.name} <span className="text-xs">({t("topbar.searchStaffTag")})</span>
                </div>
              ))}
              {results!.invoices.map((i) => (
                <Link
                  key={i.id}
                  href="/fees"
                  onClick={() => setOpen(false)}
                  className="block rounded px-2 py-1.5 text-left text-sm hover:bg-bg-elevated"
                >
                  {i.number}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
