"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getPlatformToken } from "@/lib/platform-client";

/** Client-side guard only — the real gate is the API's platformAuthGuard on every request. */
export default function SuperAdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const token = getPlatformToken();
    if (!token && pathname !== "/super-admin/login") {
      router.replace("/super-admin/login");
      return;
    }
    // localStorage is only readable client-side, so this check can't run
    // during the server render — the two-phase (unchecked -> checked) reveal
    // is the point of this effect, not an accidental data-fetch pattern.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChecked(true);
  }, [pathname, router]);

  if (!checked) return null;
  return <>{children}</>;
}
