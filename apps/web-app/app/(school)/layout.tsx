"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getAdminToken, TOKEN_CHANGE_EVENT } from "@/lib/admin-client";
import { SchoolSidebar } from "@/components/school-sidebar";
import { AppTopbar } from "@/components/app-topbar";
import { BranchSelector } from "@/components/branch-selector";

/** Client-side guard only — the real gate is the API's authGuard/tenantContext on every request (same posture as the super-admin layout). */
export default function SchoolLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    function check() {
      const token = getAdminToken();
      if (!token && pathname !== "/login") {
        router.replace("/login");
        return;
      }
      setChecked(true);
    }
    check();
    // Reacts to components/token-refresher.tsx clearing the token (a dead
    // refresh token, e.g.) while this layout is already mounted — without
    // this, only a route change or full reload would notice and redirect,
    // leaving a blank authenticated-looking page in between.
    window.addEventListener(TOKEN_CHANGE_EVENT, check);
    return () => window.removeEventListener(TOKEN_CHANGE_EVENT, check);
  }, [pathname, router]);

  if (!checked) return null;
  if (pathname === "/login") return <>{children}</>;

  return (
    <div className="flex min-h-screen w-full bg-bg-base">
      <SchoolSidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <AppTopbar />
        <div className="flex items-center justify-end border-b border-border bg-bg-surface px-4 py-2 md:px-6">
          <BranchSelector />
        </div>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
