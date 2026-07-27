"use client";

import { useState, type FormEvent } from "react";
import { submitPublicEnquiry } from "@/lib/api-client";

export function AdmissionForm({ schoolCode }: { schoolCode: string }) {
  const [childName, setChildName] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus("submitting");
    const result = await submitPublicEnquiry(schoolCode, { childName, guardianName, phone, source: "website" });
    if (result.ok) {
      setStatus("done");
    } else {
      setStatus("error");
      setErrorMessage(result.message);
    }
  }

  if (status === "done") {
    return <p className="rounded-md bg-green-50 p-4 text-sm text-green-800">Thanks! We&apos;ll be in touch soon.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-3">
      <input
        className="rounded-md border px-3 py-2 text-sm"
        placeholder="Child's name"
        value={childName}
        onChange={(e) => setChildName(e.target.value)}
        required
      />
      <input
        className="rounded-md border px-3 py-2 text-sm"
        placeholder="Parent/guardian's name"
        value={guardianName}
        onChange={(e) => setGuardianName(e.target.value)}
        required
      />
      <input
        className="rounded-md border px-3 py-2 text-sm"
        placeholder="Phone number"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        required
      />
      {status === "error" ? <p className="text-sm text-red-600">{errorMessage}</p> : null}
      <button
        type="submit"
        disabled={status === "submitting"}
        className="rounded-md bg-[var(--brand)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {status === "submitting" ? "Submitting…" : "Enquire now"}
      </button>
    </form>
  );
}
