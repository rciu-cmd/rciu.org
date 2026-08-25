"use client";

import { useLanguage } from "@/lib/language-context";

export default function ContactPage() {
  const { t } = useLanguage();

  return (
    <div className="container-page py-14">
      <h1 className="text-3xl font-bold text-rotary-royal-blue mb-3">
        {t("Холбоо барих", "Contact Us", "お問い合わせ", "联系我们")}
      </h1>
      <p className="text-slate-600 max-w-2xl mb-10">
        {t(
          "Уулзалт, төсөл, гишүүнчлэл болон дурын бусад асуултын хувьд бидэнтэй чөлөөтэй холбогдоно уу — манай баг тантай тун удахгүй холбогдох болно.",
          "Whether it's about a meeting, a project, membership, or anything else, feel free to reach out — our team will get back to you promptly.",
          "例会、プロジェクト、入会、その他どのようなご質問でも、お気軽にお問い合わせください。担当者より速やかにご連絡いたします。",
          "无论是关于例会、项目、入会还是其他任何问题,欢迎随时与我们联系,我们会尽快回复您。"
        )}
      </p>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="font-bold text-rotary-royal-blue mb-4">
            {t("Долоо хоногийн уулзалт", "Weekly Meeting", "定例会", "例会")}
          </h2>
          <p className="text-slate-700 font-medium">{t("Мягмар гараг бүр, 20:00 цагт", "Every Tuesday at 20:00", "毎週火曜日 20:00", "每周二 20:00")}</p>
          <p className="text-slate-600 text-sm mt-1">
            Red Rock Castle Restaurant<br />
            1 khoroo, Sukhbaatar District<br />
            Ulaanbaatar, 46, Mongolia
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="font-bold text-rotary-royal-blue mb-4">
            {t("И-мэйл, утасны дугаар", "Email & Phone", "メール・電話", "邮箱与电话")}
          </h2>
          <p className="text-slate-700">rciu.mng@gmail.com</p>
          <p className="text-slate-700">+976 99031147</p>
        </div>

        <div className="rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="font-bold text-rotary-royal-blue mb-4">
            {t("Шуудангийн хаяг", "Mailing Address", "郵送先住所", "邮寄地址")}
          </h2>
          <p className="text-slate-600 text-sm">
            Rotary Club of Ikh Urgoo<br />
            100-5, 15 khoroo, Bayanzurkh District<br />
            Ulaanbaatar, 13370, Mongolia
          </p>
        </div>
      </div>
    </div>
  );
}
