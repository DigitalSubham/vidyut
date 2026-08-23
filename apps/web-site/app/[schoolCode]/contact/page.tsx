import { notFound } from "next/navigation";
import { getPublicContact, getPublicSchoolInfo } from "@/lib/api-client";

export default async function ContactPage({ params }: { params: Promise<{ schoolCode: string }> }) {
  const { schoolCode } = await params;
  const info = await getPublicSchoolInfo(schoolCode);
  if (!info) {
    notFound();
  }
  const contact = await getPublicContact(schoolCode);

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <header>
        <h1 className="text-3xl font-bold">{info.name}</h1>
        <p className="text-sm text-[var(--text-secondary)]">Contact</p>
      </header>

      <section className="flex flex-col gap-2 rounded-md border p-4">
        {contact?.phone ? <p>Phone: {contact.phone}</p> : null}
        {contact?.email ? <p>Email: {contact.email}</p> : null}
        {contact?.address ? <p>Address: {contact.address}</p> : null}
        {contact?.mapUrl ? (
          <a href={contact.mapUrl} target="_blank" rel="noreferrer" className="text-[var(--brand-primary,#4F46E5)] underline">
            View on map
          </a>
        ) : null}
        {!contact?.phone && !contact?.email && !contact?.address ? (
          <p className="text-sm text-[var(--text-secondary)]">Contact details not published yet.</p>
        ) : null}
      </section>

      {contact && contact.branches.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Branches</h2>
          {contact.branches.map((branch) => (
            <div key={branch.id} className="rounded-md border p-4">
              <p className="font-medium">{branch.name}</p>
              {branch.address ? <p className="text-sm text-[var(--text-secondary)]">{branch.address}</p> : null}
            </div>
          ))}
        </section>
      ) : null}
    </main>
  );
}
