import { notFound } from "next/navigation";
import { getPublicSchoolInfo } from "@/lib/api-client";
import { AdmissionForm } from "./admission-form";

export default async function SchoolPublicPage({ params }: { params: Promise<{ schoolCode: string }> }) {
  const { schoolCode } = await params;
  const info = await getPublicSchoolInfo(schoolCode);
  if (!info) {
    notFound();
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 p-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">{info.name}</h1>
        <p className="text-sm text-[var(--text-secondary)]">School code: {info.schoolCode}</p>
        <nav className="flex gap-4 text-sm underline">
          <a href={`/${schoolCode}/notices`}>Notices</a>
          <a href={`/${schoolCode}/gallery`}>Gallery</a>
          <a href={`/${schoolCode}/contact`}>Contact</a>
        </nav>
      </header>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Branches</h2>
        {info.branches.map((branch) => (
          <div key={branch.id} className="rounded-md border p-4">
            <p className="font-medium">{branch.name}</p>
            <p className="text-sm text-[var(--text-secondary)]">
              {branch.board}
              {branch.address ? ` — ${branch.address}` : ""}
            </p>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Admission enquiry</h2>
        <AdmissionForm schoolCode={info.schoolCode} />
      </section>
    </main>
  );
}
