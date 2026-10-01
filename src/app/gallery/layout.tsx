import type { Metadata } from "next";

// Members-only Photo Library (login-gated) — titled, but kept out of
// search results like /members.
export const metadata: Metadata = {
  title: "Photo Library",
  robots: { index: false, follow: false },
};

export default function GalleryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
