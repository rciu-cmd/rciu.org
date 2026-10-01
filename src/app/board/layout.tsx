import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Удирдлага · Board",
  description: "Их Өргөө Ротари Клубын 2026-2027 оны удирдах зөвлөл. The 2026-2027 Board of Directors of Rotary Club of Ikh Urgoo, Ulaanbaatar, Mongolia.",
};

export default function BoardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
