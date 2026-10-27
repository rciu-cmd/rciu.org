// Image loader for next/image (wired up in next.config.ts).
//
// Photos are stored in Supabase exactly as uploaded — often 5-10 MB
// straight off a camera — and GitHub Pages has no image server, so the
// home page used to download ~30 MB to show a few small cards. Photos
// from the club's storage are now fetched through wsrv.nl, a free,
// open-source image service (Cloudflare-cached), at the width each
// card actually needs on the visitor's screen (next/image picks it from
// `sizes` and the screen's pixel density), as high-quality WebP. It
// never enlarges past the original (&we). The originals themselves are
// never changed, and the full-size viewer and "Full size" links still
// open them. If the service fails, src/components/Photo.tsx falls back
// to the original file.
//
// Everything else (the site's own logos, outside links) is returned as
// is. Member-only pages pass `unoptimized` so private photos are never
// sent through the outside service.

import type { ImageLoaderProps } from "next/image";
import { SUPABASE_URL } from "./supabase-config";

const STORAGE_PREFIX = `${SUPABASE_URL}/storage/v1/object/public/`;
const QUALITY = 85;

export default function imageLoader({ src, width, quality }: ImageLoaderProps): string {
  if (!src.startsWith(STORAGE_PREFIX)) return src;
  return `https://wsrv.nl/?url=${encodeURIComponent(src)}&w=${width}&q=${quality ?? QUALITY}&output=webp&we`;
}
