import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Холбоо барих · Contact Us",
  description: "Их Өргөө Ротари Клубтэй холбогдох: уулзалтын цаг, байршил, и-мэйл, утас. How to reach Rotary Club of Ikh Urgoo — meeting times, location, email, and phone.",
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
