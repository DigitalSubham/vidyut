const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export interface PublicBranch {
  id: string;
  name: string;
  board: string;
  address: string | null;
  logoUrl: string | null;
}

export interface PublicSchoolInfo {
  name: string;
  schoolCode: string;
  branches: PublicBranch[];
}

export async function getPublicSchoolInfo(schoolCode: string): Promise<PublicSchoolInfo | null> {
  const res = await fetch(`${API_BASE_URL}/api/v1/public/schools/${encodeURIComponent(schoolCode)}`, {
    cache: "no-store",
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { data: PublicSchoolInfo };
  return body.data;
}

export interface PublicNotice {
  id: string;
  title: string;
  body: string;
  publishedAt: string;
}

export async function getPublicNotices(schoolCode: string): Promise<PublicNotice[]> {
  const res = await fetch(`${API_BASE_URL}/api/v1/public/notices/${encodeURIComponent(schoolCode)}`, {
    cache: "no-store",
  });
  if (!res.ok) return [];
  const body = (await res.json()) as { data: PublicNotice[] };
  return body.data;
}

export interface PublicGalleryPhoto {
  id: string;
  caption: string | null;
  url: string;
}

export interface PublicGalleryAlbum {
  id: string;
  title: string;
  photos: PublicGalleryPhoto[];
}

export async function getPublicGallery(schoolCode: string): Promise<PublicGalleryAlbum[]> {
  const res = await fetch(`${API_BASE_URL}/api/v1/public/gallery/${encodeURIComponent(schoolCode)}`, {
    cache: "no-store",
  });
  if (!res.ok) return [];
  const body = (await res.json()) as { data: PublicGalleryAlbum[] };
  return body.data;
}

export interface PublicContact {
  phone: string | null;
  email: string | null;
  address: string | null;
  mapUrl: string | null;
  branches: { id: string; name: string; address: string | null }[];
}

export async function getPublicContact(schoolCode: string): Promise<PublicContact | null> {
  const res = await fetch(`${API_BASE_URL}/api/v1/public/contact/${encodeURIComponent(schoolCode)}`, {
    cache: "no-store",
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { data: PublicContact };
  return body.data;
}

export async function submitPublicEnquiry(
  schoolCode: string,
  input: { childName: string; guardianName: string; phone: string; source?: string }
): Promise<{ ok: true } | { ok: false; message: string }> {
  const res = await fetch(`${API_BASE_URL}/api/v1/public/admissions/${encodeURIComponent(schoolCode)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return { ok: false, message: body?.error?.message ?? "Something went wrong. Please try again." };
  }
  return { ok: true };
}
