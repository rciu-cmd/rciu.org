import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Events",
  description: "Events calendar of Rotary Club of Ikh Urgoo, Ulaanbaatar, Mongolia — meetings, district events, project days, and installation ceremonies.",
};

export default function EventsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
