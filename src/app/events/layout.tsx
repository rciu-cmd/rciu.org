import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Арга хэмжээ · Events",
  description: "Их Өргөө Ротари Клубын арга хэмжээний хуанли — уулзалт, дүүргийн арга хэмжээ, төслийн өдрүүд. Events calendar of Rotary Club of Ikh Urgoo, Ulaanbaatar, Mongolia — meetings, district events, project days, and installation ceremonies.",
};

export default function EventsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
