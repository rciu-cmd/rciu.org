"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { asset } from "@/lib/asset";
import { supabase } from "@/lib/supabase";
import { useLanguage, LANGUAGES } from "@/lib/language-context";

const CLUB_FACEBOOK_URL = "https://www.facebook.com/profile.php?id=100086308363177";

export default function Footer() {
  const { lang, setLang, t } = useLanguage();
  // Editable from Admin → Settings ("Contact Phone Number") — same
  // live value shown on the Contact page, so the two never drift out
  // of sync with each other.
  const [phone, setPhone] = useState("+976 99031147");

  useEffect(() => {
    supabase
      .from("site_settings")
      .select("value_en")
      .eq("key", "contact_phone")
      .single()
      .then(({ data }) => {
        if (data?.value_en) setPhone(data.value_en);
      });
  }, []);

  return (
    // data-gear and relative z-10: the home page's spinning gear
    // (HomeGear) turns gold over the footer and stays behind its text.
    <footer data-gear="gold" className="bg-gradient-to-br from-rotary-royal-blue to-[#0d2c5c] text-white">
      <div className="container-page relative z-10 py-10 grid gap-8 sm:grid-cols-3">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Image src={asset("/logos/rciu-emblem.jpg")} alt="Rotary Club of Ikh Urgoo" width={36} height={36} className="rounded-full" />
            <span className="font-bold">{t("Их Өргөө Ротари Клуб", "Rotary Club of Ikh Urgoo", "イク・ウルグー・ロータリークラブ", "伊赫烏爾古扶輪社", "이흐 우르구 로타리클럽")}</span>
          </div>
          <p className="text-sm text-blue-100">
            {t(
              "Улаанбаатар, Монгол · 3450-р дүүрэг",
              "Ulaanbaatar, Mongolia · District 3450",
              "モンゴル・ウランバートル · 第3450地区",
              "蒙古國烏蘭巴托 · 3450地區",
              "몽골 울란바토르 · 3450지구"
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
          <p className="font-semibold text-white mb-2">{t("Хурлын мэдээлэл", "Meetings", "例会情報", "例會資訊", "주회 안내")}</p>
          <p>{t("Мягмар гараг бүр, 20:00", "Tuesdays, 20:00", "毎週火曜日 20:00", "每週二 20:00", "매주 화요일 20:00")}</p>
          {/* Venue name and address stay in the Latin script (as on maps and
              the sign) except in Mongolian. */}
          <p>{t("Park Castle ресторан, Сүхбаатар дүүрэг, Улаанбаатар", "Park Castle Restaurant, Sukhbaatar District, Ulaanbaatar")}</p>
        </div>

        <div className="text-sm text-blue-100">
          <p className="font-semibold text-white mb-2">{t("Холбоо барих", "Contact", "お問い合わせ", "聯絡我們", "문의")}</p>
          <p>contact@rciu.org</p>
          <p>{phone}</p>

          {/* Language switcher lives here now — moved off the navbar
              (item request: free up top-bar space) and placed next to
              Contact, the one place every visitor eventually scrolls to. */}
          <p className="font-semibold text-white mt-4 mb-2">{t("Хэл сонгох", "Language", "言語", "語言", "언어")}</p>
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
        © {new Date().getFullYear()} {t("Их Өргөө Ротари Клуб", "Rotary Club of Ikh Urgoo", "イク・ウルグー・ロータリークラブ", "伊赫烏爾古扶輪社", "이흐 우르구 로타리클럽")} · {t("Service Above Self", "Service Above Self", "超我の奉仕", "超我服務", "초아의 봉사")}
      </div>
    </footer>
  );
}
