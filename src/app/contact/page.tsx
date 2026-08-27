"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/language-context";

export default function ContactPage() {
  const { t } = useLanguage();

  return (
    <div className="container-page py-14">
      <div className="flex flex-wrap items-start justify-between gap-6 mb-3">
        <h1 className="text-3xl font-bold text-rotary-royal-blue">
          {t("Холбоо барих", "Contact Us", "お問い合わせ", "聯繫我們")}
        </h1>
        {/* Standalone CTA, deliberately not blue like the rest of the
            page — Rotary gold makes it read as an action, not just
            another info block, since this is the button most visitors
            will actually want to click. */}
        <Link
          href="/join"
          className="shrink-0 inline-block text-sm font-bold px-6 py-3 rounded-full bg-rotary-gold text-slate-900 shadow-sm hover:brightness-95 transition"
        >
          {t("Одоо элсэх →", "Join Us Now →", "今すぐ入会 →", "立即加入 →")}
        </Link>
      </div>
      <p className="text-slate-600 max-w-2xl mb-10">
        {t(
          "Уулзалт, төсөл, гишүүнчлэл болон дурын бусад асуултын хувьд бидэнтэй чөлөөтэй холбогдоно уу — манай баг тантай тун удахгүй холбогдох болно.",
          "Whether it's about a meeting, a project, membership, or anything else, feel free to reach out — our team will get back to you promptly.",
          "例会、プロジェクト、入会、その他どのようなご質問でも、お気軽にお問い合わせください。担当者より速やかにご連絡いたします。",
          "無論是關於例會、項目、入會還是其他任何問題,歡迎隨時與我們聯繫,我們會盡快回復您。"
        )}
      </p>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="font-bold text-rotary-royal-blue mb-4">
            {t("Долоо хоногийн уулзалт", "Weekly Meeting", "定例会", "例會")}
          </h2>
          <p className="text-slate-700 font-medium">{t("Мягмар гараг бүр, 20:00 цагт", "Every Tuesday at 20:00", "毎週火曜日 20:00", "每週二 20:00")}</p>
          <p className="text-slate-600 text-sm mt-1">
            Park Castle Restaurant<br />
            1 khoroo, Sukhbaatar District<br />
            Ulaanbaatar, 46, Mongolia
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="font-bold text-rotary-royal-blue mb-4">
            {t("И-мэйл, утасны дугаар", "Email & Phone", "メール・電話", "郵箱與電話")}
          </h2>
          <div className="grid gap-1 mb-2">
            <p className="text-slate-700">
              <span className="text-xs text-slate-400 mr-1.5">{t("Ерөнхий", "General", "総合", "一般")}:</span>
              contact@rciu.org
            </p>
            <p className="text-slate-700">
              <span className="text-xs text-slate-400 mr-1.5">{t("Нарийн бичиг", "Secretary", "書記", "秘書")}:</span>
              secretary@rciu.org
            </p>
          </div>
          <p className="text-slate-700">+976 99031147</p>
        </div>

        <div className="rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="font-bold text-rotary-royal-blue mb-4">
            {t("Шуудангийн хаяг", "Mailing Address", "郵送先住所", "郵寄地址")}
          </h2>
          <p className="text-slate-600 text-sm">
            Rotary Club of Ikh Urgoo – Secretary General<br />
            Apartment 70, Building 35<br />
            1st Khoroo, Chingeltei District<br />
            Ulaanbaatar 15170<br />
            MONGOLIA
          </p>
        </div>
      </div>
    </div>
  );
}
