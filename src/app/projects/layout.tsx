import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Projects",
  description: "Community service projects by Rotary Club of Ikh Urgoo — education, maternal and child health, and disease prevention initiatives in Ulaanbaatar, Mongolia.",
};

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
