import type { Metadata } from "next";

// /projects/view/?id=… is one page for every project (the project comes
// from the query string), so it can't name the project's address as its
// own. Keep it out of search; the per-project /projects/<id>/ pages in
// the sitemap are the ones Google should list.
export const metadata: Metadata = {
  alternates: { canonical: null },
  robots: { index: false, follow: true },
};

export default function ProjectsViewLayout({ children }: { children: React.ReactNode }) {
  return children;
}
