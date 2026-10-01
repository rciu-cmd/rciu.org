import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Бидний тухай · About Us",
  description: "Их Өргөө Ротари Клубын түүх, удирдлага, Ротари Интернэшнлийн 3450-р дүүрэгт гүйцэтгэх үүрэг. Learn about Rotary Club of Ikh Urgoo — our charter, our board, and our place in Rotary International District 3450, Ulaanbaatar, Mongolia.",
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
