import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Бидэнтэй нэгдээрэй · Join Our Club",
  description: "Их Өргөө Ротари Клубт хэрхэн элсэх тухай, сонирхлын хүсэлт илгээх маягт. Interested in joining Rotary Club of Ikh Urgoo? Here's how to become a member, and a form to get in touch.",
};

export default function JoinLayout({ children }: { children: React.ReactNode }) {
  return children;
}
