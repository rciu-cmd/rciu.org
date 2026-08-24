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
          "Хурал, төсөл, эсвэл клубт нэгдэх талаар асуух зүйл байвал бидэнтэй холбогдоно уу.",
          "Questions about meetings, projects, or joining the club? Get in touch.",
          "例会、プロジェクト、入会についてのご質問はお気軽にご連絡ください。",
          "如有关于例会、项目或入会的问题,请随时与我们联系。"
        )}
      </p>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="font-bold text-rotary-royal-blue mb-4">
            {t("Хурлын байршил", "Meeting — In Person", "例会(対面)", "例会(线下)")}
          </h2>
          <p className="text-slate-700">{t("Мягмар гараг, 20:00 цаг", "Tuesdays at 20:00", "毎週火曜日 20:00", "每周二 20:00")}</p>
          <p className="text-slate-600 text-sm mt-1">
            Red Rock Castle Restaurant<br />
            1 khoroo, Sukhbaatar District<br />
            Ulaanbaatar, 46, Mongolia
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="font-bold text-rotary-royal-blue mb-4">
            {t("Имэйл, утас", "Email & Phone", "メール・電話", "邮箱与电话")}
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
