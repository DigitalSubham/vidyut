import { notFound } from "next/navigation";
import { getPublicGallery, getPublicSchoolInfo } from "@/lib/api-client";

export default async function GalleryPage({ params }: { params: Promise<{ schoolCode: string }> }) {
  const { schoolCode } = await params;
  const info = await getPublicSchoolInfo(schoolCode);
  if (!info) {
    notFound();
  }
  const albums = await getPublicGallery(schoolCode);

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 p-6">
      <header>
        <h1 className="text-3xl font-bold">{info.name}</h1>
        <p className="text-sm text-[var(--text-secondary)]">Gallery</p>
      </header>

      {albums.length === 0 ? (
        <p className="text-sm text-[var(--text-secondary)]">No photos published yet.</p>
      ) : (
        albums.map((album) => (
          <section key={album.id} className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">{album.title}</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {album.photos.map((photo) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={photo.id}
                  src={photo.url}
                  alt={photo.caption ?? album.title}
                  className="aspect-square w-full rounded-md object-cover"
                />
              ))}
            </div>
          </section>
        ))
      )}
    </main>
  );
}
