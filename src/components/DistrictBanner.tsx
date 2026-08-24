"use client";

import Image from "next/image";
import { asset } from "@/lib/asset";
import { useLanguage } from "@/lib/language-context";

// Slim strip above the theme banner, showing the district affiliation
// — a quick "we're part of something bigger" signal right at the top
// of every page.
export default function DistrictBanner() {
  const { t } = useLanguage();

  return (
    <div className="w-full bg-slate-900 border-b border-slate-800">
      <div className="container-page h-8 flex items-center justify-center gap-2.5">
        <Image src={asset("/logos/district-3450.png")} alt="Rotary District 3450" width={22} height={12} className="object-contain" />
        <span className="text-[11px] font-semibold text-slate-300 tracking-wide">
          {t(
            "Rotary Club of Ikh Urgoo · Дүүрэг 3450",
            "Rotary Club of Ikh Urgoo · District 3450",
            "イク・ウルグー・ロータリークラブ · 地区3450",
            "扶轮伊赫乌尔古俱乐部 · 3450区"
          )}
        </span>
      </div>
    </div>
  );
}
