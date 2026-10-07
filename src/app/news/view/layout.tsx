import type { Metadata } from "next";

// /news/view/?id=… is one page for every post (the post comes from the
// query string), so it can't name the post's address as its own. Keep it
// out of search; the per-post /news/<id>/ pages in the sitemap are the
// ones Google should list.
export const metadata: Metadata = {
  alternates: { canonical: null },
  robots: { index: false, follow: true },
};

export default function NewsViewLayout({ children }: { children: React.ReactNode }) {
  return children;
}
