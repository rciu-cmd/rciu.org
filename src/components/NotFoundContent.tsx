"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/language-context";

// Body of the site-wide 404 page (src/app/not-found.tsx). GitHub Pages
// serves the exported out/404.html for any URL that doesn't exist, so
// this shows inside the normal navbar/footer, in the visitor's language.
export default function NotFoundContent() {
  const { t } = useLanguage();

  const links = [
    { href: "/about", label: t("Бидний тухай", "About", "私たちについて", "關於我們", "소개") },
    { href: "/news", label: t("Мэдээ", "News", "ニュース", "新聞", "소식") },
    { href: "/projects", label: t("Төслүүд", "Projects", "プロジェクト", "服務計畫", "프로젝트") },
    { href: "/events", label: t("Арга хэмжээ", "Events", "イベント", "活動", "행사") },
    { href: "/contact", label: t("Холбоо барих", "Contact", "お問い合わせ", "聯絡我們", "문의") },
  ];

  return (
    <div className="container-page py-20 text-center">
      <p className="text-6xl font-extrabold text-rotary-gold mb-4">404</p>
      <h1 className="text-3xl font-bold text-rotary-royal-blue mb-3">
        {t("Хуудас олдсонгүй", "Page not found", "ページが見つかりません", "找不到頁面", "페이지를 찾을 수 없습니다")}
      </h1>
      <p className="text-slate-600 max-w-md mx-auto mb-8">
        {t(
          "Таны хайсан хуудас байхгүй эсвэл өөр хаяг руу шилжсэн байна.",
          "The page you're looking for doesn't exist or has moved.",
          "お探しのページは存在しないか、移動した可能性があります。",
          "您要找的頁面不存在或已移動。",
          "찾으시는 페이지가 없거나 이동되었습니다."
        )}
      </p>
      <Link
        href="/"
        className="inline-block bg-rotary-royal-blue text-white font-semibold rounded-md px-6 py-2.5 text-sm hover:brightness-110 transition"
      >
        {t("Нүүр хуудас руу", "Go to the home page", "ホームへ", "返回首頁", "홈으로")}
      </Link>
      <nav className="mt-8 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm font-medium">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="text-rotary-royal-blue hover:underline">
            {l.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
