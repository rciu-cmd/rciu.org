import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "How to reach Rotary Club of Ikh Urgoo — meeting times, location, email, and phone.",
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
