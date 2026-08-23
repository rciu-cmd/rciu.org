import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Members",
  robots: { index: false, follow: false },
};

export default function MembersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
