import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Мэдээ · News",
  description: "Их Өргөө Ротари Клубын сүүлийн үеийн мэдээ. Latest news and updates from Rotary Club of Ikh Urgoo, Ulaanbaatar, Mongolia.",
};

export default function NewsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
