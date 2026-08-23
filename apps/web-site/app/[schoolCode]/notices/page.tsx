import { notFound } from "next/navigation";
import { getPublicNotices, getPublicSchoolInfo } from "@/lib/api-client";

export default async function NoticesPage({ params }: { params: Promise<{ schoolCode: string }> }) {
  const { schoolCode } = await params;
  const info = await getPublicSchoolInfo(schoolCode);
  if (!info) {
    notFound();
  }
  const notices = await getPublicNotices(schoolCode);

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <header>
        <h1 className="text-3xl font-bold">{info.name}</h1>
        <p className="text-sm text-[var(--text-secondary)]">Notices</p>
      </header>

      <section className="flex flex-col gap-3">
        {notices.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">No notices published yet.</p>
        ) : (
          notices.map((notice) => (
            <article key={notice.id} className="rounded-md border p-4">
              <p className="font-medium">{notice.title}</p>
              <p className="text-sm text-[var(--text-secondary)]">{new Date(notice.publishedAt).toLocaleDateString()}</p>
              <p className="mt-2">{notice.body}</p>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
