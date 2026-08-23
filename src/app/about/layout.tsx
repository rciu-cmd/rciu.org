import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us",
  description: "Learn about Rotary Club of Ikh Urgoo — our charter, our board, and our place in Rotary International District 3450, Ulaanbaatar, Mongolia.",
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
