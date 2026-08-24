"use client";

import { useEffect, useState } from "react";
import { asset } from "@/lib/asset";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/language-context";

type PresidentRow = { id: string; name: string; year_range: string };

export default function AboutPage() {
  const { t } = useLanguage();
  const [historyMn, setHistoryMn] = useState("");
  const [historyEn, setHistoryEn] = useState("");
  const [presidents, setPresidents] = useState<PresidentRow[]>([]);

  useEffect(() => {
    supabase
      .from("site_settings")
      .select("value_mn, value_en")
      .eq("key", "club_history_mn")
      .maybeSingle()
      .then(({ data }) => {
        setHistoryMn(data?.value_mn ?? "");
        setHistoryEn(data?.value_en ?? "");
      });
    supabase
      .from("club_past_presidents")
      .select("id, name, year_range")
      .order("sort_order")
      .then(({ data }) => setPresidents((data as PresidentRow[]) ?? []));
  }, []);

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
          </div>
          <p className="text-xs text-slate-400 mt-3">
            {t(
              "Байгууллагын гэрчилгээ нь Interact Club of Urgoo-д хамаарах тул",
              "The Certificate of Organization belongs to the Interact Club of Urgoo, so it's shown",
              "組織証明書はアーゴー・インターアクトクラブのものであるため、",
              "组织证书属于乌尔古扶青团,因此"
            )}{" "}
            <a href={asset("/certificates/urgoo-certificate-of-organization.pdf")} target="_blank" rel="noopener noreferrer" className="text-rotary-azure font-semibold hover:underline">
              {t("тэнд", "there", "そちら", "在那里")}
            </a>{" "}
            {t("харагдана.", "instead, alongside the Interact club's info.", "に表示されます。", "显示。")}
          </p>
        </div>
      </div>

      {historyEn && (
        <div className="mb-14">
          <h2 className="text-2xl font-bold text-rotary-royal-blue mb-4">
            {t("Клубын түүх", "Our History", "クラブの歴史", "俱乐部历史")}
          </h2>
          <p className="text-slate-600 max-w-2xl">{t(historyMn, historyEn)}</p>
        </div>
      )}

      {presidents.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-rotary-royal-blue mb-4">
            {t("Урьд өмнөх тэргүүнүүд", "Past Presidents", "歴代会長", "历任社长")}
          </h2>
          <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 max-w-3xl">
            {presidents.map((p) => (
              <li key={p.id} className="rounded-lg border border-slate-200 px-4 py-2.5 flex items-center justify-between">
                <span className="font-semibold text-slate-900">{p.name}</span>
                <span className="text-sm text-slate-500">{p.year_range}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
