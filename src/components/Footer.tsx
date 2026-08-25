"use client";

import Image from "next/image";
import { asset } from "@/lib/asset";
import { useLanguage, LANGUAGES } from "@/lib/language-context";

const CLUB_FACEBOOK_URL = "https://www.facebook.com/profile.php?id=100086308363177";

export default function Footer() {
  const { lang, setLang, t } = useLanguage();

  return (
    <footer className="bg-gradient-to-br from-rotary-royal-blue to-[#0d2c5c] text-white">
      <div className="container-page py-10 grid gap-8 sm:grid-cols-3">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Image src={asset("/logos/rciu-emblem.jpg")} alt="Rotary Club of Ikh Urgoo" width={36} height={36} className="rounded-full" />
            <span className="font-bold">{t("Их Өргөө Ротари Клуб", "Rotary Club of Ikh Urgoo", "イク・ウルグー・ロータリークラブ", "扶轮伊赫乌尔古俱乐部")}</span>
          </div>
          <p className="text-sm text-blue-100">
            {t(
              "Ulaanbaatar, Mongolia · District 3450",
              "Ulaanbaatar, Mongolia · District 3450",
              "モンゴル、ウランバートル · 地区3450",
              "蒙古国乌兰巴托 · 3450区"
            )}
          </p>
          {/* Facebook — moved here from the "Links & Partners" strip
              per the club's request. The icon's normal navy circle
              would nearly disappear on this blue gradient, so it gets
              a white plate behind it here for contrast. */}
          <a
            href={CLUB_FACEBOOK_URL}
            target="_blank"
            rel="noopener noreferrer"
            title="Facebook"
            className="inline-flex mt-4 bg-white rounded-full p-0.5 hover:opacity-80 transition"
          >
            <Image src={asset("/logos/facebook-icon.svg")} alt="Facebook" width={32} height={32} className="w-8 h-8" />
          </a>
        </div>

        <div className="text-sm text-blue-100">
          <p className="font-semibold text-white mb-2">{t("Хурлын мэдээлэл", "Meetings", "例会情報", "例会信息")}</p>
          <p>{t("Мягмар гараг, 20:00", "Tuesdays, 20:00", "毎週火曜日 20:00", "每周二 20:00")}</p>
          <p>Red Rock Castle Restaurant, Sukhbaatar District, Ulaanbaatar</p>
        </div>

        <div className="text-sm text-blue-100">
          <p className="font-semibold text-white mb-2">{t("Холбоо барих", "Contact", "お問い合わせ", "联系方式")}</p>
          <p>rciu.mng@gmail.com</p>
          <p>+976 99031147</p>

          {/* Language switcher lives here now — moved off the navbar
              (item request: free up top-bar space) and placed next to
              Contact, the one place every visitor eventually scrolls to. */}
          <p className="font-semibold text-white mt-4 mb-2">{t("Хэл сонгох", "Language", "言語", "语言")}</p>
          <div className="flex gap-1.5">
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                onClick={() => setLang(l.code)}
                aria-label={l.name}
                title={l.name}
                className={`w-8 h-8 flex items-center justify-center rounded text-lg leading-none ${
                  lang === l.code ? "bg-white/25 ring-2 ring-white" : "bg-white/10 hover:bg-white/20"
                }`}
              >
                {l.flag}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="border-t border-white/15 py-4 text-center text-xs text-blue-100">
        © {new Date().getFullYear()} Rotary Club of Ikh Urgoo. Service Above Self.
      </div>
    </footer>
  );
}
