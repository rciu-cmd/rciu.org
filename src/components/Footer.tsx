"use client";

import Image from "next/image";
import { asset } from "@/lib/asset";
import { useLanguage } from "@/lib/language-context";

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="bg-rotary-royal-blue text-white mt-16">
      <div className="container-page py-10 grid gap-8 sm:grid-cols-3">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Image src={asset("/logos/ri-gear-logo.png")} alt="Rotary International" width={36} height={36} />
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
        </div>
      </div>
      <div className="border-t border-white/15 py-4 text-center text-xs text-blue-100">
        © {new Date().getFullYear()} Rotary Club of Ikh Urgoo. Service Above Self.
      </div>
    </footer>
  );
}
