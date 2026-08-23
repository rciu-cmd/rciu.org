"use client";

import { asset } from "@/lib/asset";
import { useLanguage } from "@/lib/language-context";

export default function AboutPage() {
  const { t } = useLanguage();

  return (
    <div className="container-page py-14">
      <h1 className="text-3xl font-bold text-rotary-royal-blue mb-3">
        {t("Бидний тухай", "About Us", "私たちについて", "关于我们")}
      </h1>
      <p className="text-slate-600 max-w-2xl mb-10">
        {t(
          "Rotary Club of Ikh Urgoo нь Rotary International-ийн албан ёсны гишүүн клуб бөгөөд Улаанбаатар хотод, дэлхийн Rotary гэр бүлийн нэг хэсэг болон үйлчилдэг.",
          "Rotary Club of Ikh Urgoo is an officially chartered member club of Rotary International, serving Ulaanbaatar as part of the worldwide Rotary family — District 3450.",
          "イクー・ウルグー・ロータリークラブは、ロータリー・インターナショナルの正式に認可された会員クラブであり、地区3450としてウランバートルで奉仕しています。",
          "扶轮伊赫乌尔古俱乐部是国际扶轮正式注册的会员俱乐部,作为3450区在乌兰巴托为全球扶轮大家庭服务。"
        )}
      </p>

      <div className="grid gap-6 sm:grid-cols-2 mb-14">
        <div className="rounded-xl border border-slate-200 p-6">
          <h2 className="font-bold text-rotary-royal-blue mb-2">
            {t("Эрхэм зорилго", "Our Mission", "私たちの使命", "我们的使命")}
          </h2>
          <p className="text-slate-600 text-sm">
            {t(
              "Service Above Self — өөрийгөө умартан бусдад үйлчлэх зарчмаар дэлхийн болон орон нутгийн хэрэгцээнд хариу үзүүлэх.",
              "Service Above Self — responding to community and international needs through fellowship, integrity, and humanitarian service.",
              "「奉仕は自己を超えて」— 友情、誠実さ、人道的奉仕を通じて地域社会と国際的なニーズに応えます。",
              "超我服务 — 通过友谊、诚信与人道服务回应社区及国际需求。"
            )}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 p-6">
          <h2 className="font-bold text-rotary-royal-blue mb-2">
            {t("Дүрэмт клуб", "Officially Chartered", "正式認可クラブ", "正式注册俱乐部")}
          </h2>
          <p className="text-slate-600 text-sm mb-3">
            {t(
              "Rotary International-ийн дүрэмт гэрчилгээ, байгууллагын гэрчилгээ.",
              "Chartered by Rotary International — official certificates on file.",
              "ロータリー・インターナショナルより正式に認可されています。",
              "由国际扶轮正式注册,证书存档在案。"
            )}
          </p>
          <div className="flex flex-col gap-1 text-sm">
            <a href={asset("/certificates/rciu-charter-certificate.pdf")} target="_blank" rel="noopener noreferrer" className="text-rotary-azure font-semibold hover:underline">
              {t("Дүрэмт клубын гэрчилгээ (PDF)", "Charter Certificate (PDF)", "認可証明書 (PDF)", "特许证书 (PDF)")}
            </a>
            <a href={asset("/certificates/urgoo-certificate-of-organization.pdf")} target="_blank" rel="noopener noreferrer" className="text-rotary-azure font-semibold hover:underline">
              {t("Байгууллагын гэрчилгээ (PDF)", "Certificate of Organization (PDF)", "組織証明書 (PDF)", "组织证书 (PDF)")}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
