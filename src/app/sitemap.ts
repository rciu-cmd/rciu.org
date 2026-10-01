import type { MetadataRoute } from "next";
import { getNewsShareItems, getProjectShareItems } from "@/lib/share-data";

// /sitemap.xml, written at build time: the public pages plus every
// published news post and project page (/news/<id>/, /projects/<id>/),
// so Google finds each one. Rebuilt whenever news or projects change
// (migration28), like those pages themselves.
export const dynamic = "force-static";

const SITE = "https://rciu.org";

const PAGES: [path: string, priority: number][] = [
  ["/", 1.0],
  ["/about/", 0.8],
  ["/news/", 0.7],
  ["/projects/", 0.8],
  ["/events/", 0.7],
  ["/board/", 0.5],
  ["/join/", 0.8],
  ["/contact/", 0.6],
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [news, projects] = await Promise.all([getNewsShareItems(), getProjectShareItems()]);
  return [
    ...PAGES.map(([path, priority]) => ({ url: `${SITE}${path}`, priority })),
    ...news.map((n) => ({ url: `${SITE}/news/${n.id}/`, priority: 0.6 })),
    ...projects.map((p) => ({ url: `${SITE}/projects/${p.id}/`, priority: 0.6 })),
  ];
}
