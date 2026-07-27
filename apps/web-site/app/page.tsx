"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

/**
 * Unit 29's Open Question 1: this is a per-tenant site, not a shared
 * marketing site — the root page is just a schoolCode entry point into
 * `/[schoolCode]`, the same schoolCode the mobile app (Unit 15b) already
 * resolves.
 */
export default function HomePage() {
  const router = useRouter();
  const [schoolCode, setSchoolCode] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (schoolCode.trim()) {
      router.push(`/${schoolCode.trim().toUpperCase()}`);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border p-6">
        <h1 className="text-xl font-semibold">Find your school</h1>
        <input
          className="rounded-md border px-3 py-2 text-sm"
          placeholder="School code, e.g. AB12CD"
          value={schoolCode}
          onChange={(e) => setSchoolCode(e.target.value)}
        />
        <button type="submit" className="rounded-md bg-[var(--brand)] px-4 py-2 text-sm font-medium text-white">
          Go
        </button>
      </form>
    </main>
  );
}
