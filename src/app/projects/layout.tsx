import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Төслүүд · Projects",
  description: "Их Өргөө Ротари Клубын олон нийтэд чиглэсэн төслүүд — боловсрол, эх хүүхдийн эрүүл мэнд, өвчнөөс урьдчилан сэргийлэх. Community service projects by Rotary Club of Ikh Urgoo — education, maternal and child health, and disease prevention initiatives in Ulaanbaatar, Mongolia.",
};

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
