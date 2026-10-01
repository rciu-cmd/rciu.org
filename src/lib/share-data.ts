// Build-time data for link previews (Facebook, Messenger, etc.).
//
// Preview crawlers don't run JavaScript, so they only ever see the
// static HTML — and every news/project detail page used to be the same
// empty /news/view/ shell, giving every shared link the generic club
// card. At build time this fetches the published news and projects so
// /news/<id>/ and /projects/<id>/ get their own title, description and
// photo in the HTML (see src/app/news/[id]/page.tsx).
//
// Runs only during `next build` (GitHub Actions), never in the browser.
// The deploy workflow also rebuilds every hour, so new posts get a
// preview without waiting for a code change. If Supabase can't be
// reached, this logs a warning and returns nothing: the site still
// builds, and the pages fall back to the general club preview.

import type { Metadata } from "next";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./supabase-config";

export type ShareItem = {
  id: string;
  title: string | null;
  description: string | null;
  image: string | null;
};

const DESCRIPTION_MAX = 200;

async function rest<T>(query: string): Promise<T[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${query}`, {
    headers: { apikey: SUPABASE_PUBLISHABLE_KEY },
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return (await res.json()) as T[];
}

// Mongolian first — it's the club's main language and most shares go to
// Mongolian readers on Facebook — then English.
function pick(mn: string | null, en: string | null): string | null {
  return mn?.trim() || en?.trim() || null;
}

function summary(text: string | null): string | null {
  if (!text) return null;
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > DESCRIPTION_MAX ? `${flat.slice(0, DESCRIPTION_MAX - 1).trimEnd()}…` : flat;
}

function photoUrl(storagePath: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/rciu-photos/${storagePath.split("/").map(encodeURIComponent).join("/")}`;
}

type NewsRow = {
  id: string;
  title_mn: string | null;
  title_en: string | null;
  body_mn: string | null;
  body_en: string | null;
  cover_image_url: string | null;
};

type ProjectRow = {
  id: string;
  title_mn: string | null;
  title_en: string | null;
  description_mn: string | null;
  description_en: string | null;
  cover_image_url: string | null;
};

let newsPromise: Promise<ShareItem[]> | undefined;
let projectsPromise: Promise<ShareItem[]> | undefined;

// Fetched once per build and shared by generateStaticParams and every
// page's generateMetadata.
export function getNewsShareItems(): Promise<ShareItem[]> {
  newsPromise ??= rest<NewsRow>(
    "news?select=id,title_mn,title_en,body_mn,body_en,cover_image_url&status=eq.published&order=published_at.desc.nullslast"
  )
    .then((rows) =>
      rows.map((n) => ({
        id: n.id,
        title: pick(n.title_mn, n.title_en),
        description: summary(pick(n.body_mn, n.body_en)),
        image: n.cover_image_url,
      }))
    )
    .catch((err) => {
      console.warn(`[share-data] Couldn't load news for link previews — building without them: ${err}`);
      return [];
    });
  return newsPromise;
}

export function getProjectShareItems(): Promise<ShareItem[]> {
  projectsPromise ??= Promise.all([
    rest<ProjectRow>("projects?select=id,title_mn,title_en,description_mn,description_en,cover_image_url"),
    // Oldest first, matching the photo order on the project page.
    rest<{ project_id: string; storage_path: string }>("project_media?select=project_id,storage_path&order=created_at.asc"),
  ])
    .then(([projects, media]) => {
      const firstPhoto = new Map<string, string>();
      for (const m of media) if (!firstPhoto.has(m.project_id)) firstPhoto.set(m.project_id, photoUrl(m.storage_path));
      return projects.map((p) => ({
        id: p.id,
        title: pick(p.title_mn, p.title_en),
        description: summary(pick(p.description_mn, p.description_en)),
        // Same order the site uses: the project's own photos, then the
        // older single cover image.
        image: firstPhoto.get(p.id) || p.cover_image_url || null,
      }));
    })
    .catch((err) => {
      console.warn(`[share-data] Couldn't load projects for link previews — building without them: ${err}`);
      return [];
    });
  return projectsPromise;
}

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

// A static export won't build a [id] route with zero pages, which is what
// a build with no posts (or no Supabase access) would give — so emit one
// placeholder page instead. It isn't indexed and shows "not found".
export const PLACEHOLDER_ID = "_";

export function staticParams(items: ShareItem[]): { id: string }[] {
  return items.length ? items.map((i) => ({ id: i.id })) : [{ id: PLACEHOLDER_ID }];
}

// <head> tags for one post/project page. Child metadata replaces the
// root layout's openGraph object wholesale, so site name, locale and the
// fallback image are repeated here. Relative URLs resolve against the
// root layout's metadataBase (https://rciu.org).
export function shareMetadata(item: ShareItem | undefined, path: string, fallbackTitle: string): Metadata {
  if (path.includes(`/${PLACEHOLDER_ID}/`)) return { title: { absolute: `${fallbackTitle} · Rotary Club of Ikh Urgoo` }, robots: { index: false, follow: false } };
  const title = item?.title ?? fallbackTitle;
  const description = item?.description ?? undefined;
  // No photo of its own: the club's wide share picture (same as the
  // home page's), so the preview is still a full-width image.
  const images = item?.image ? [{ url: item.image }] : [{ url: `${BASE_PATH}/logos/rciu-share.png`, width: 1200, height: 630 }];
  return {
    // Absolute: the root layout's "%s · Rotary Club of Ikh Urgoo" template
    // doesn't reach this far, because /news and /projects set plain titles.
    title: { absolute: `${title} · Rotary Club of Ikh Urgoo` },
    description,
    alternates: { canonical: `${BASE_PATH}${path}` },
    openGraph: {
      type: "article",
      url: `${BASE_PATH}${path}`,
      siteName: "Rotary Club of Ikh Urgoo",
      locale: "mn_MN",
      title,
      description,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: images.map((i) => i.url),
    },
  };
}
