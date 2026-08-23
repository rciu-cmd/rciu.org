import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "News",
  description: "Latest news and updates from Rotary Club of Ikh Urgoo, Ulaanbaatar, Mongolia.",
};

export default function NewsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
