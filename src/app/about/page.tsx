"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { asset } from "@/lib/asset";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/language-context";
import WorldTravelMap, { TravelPoint } from "@/components/WorldTravelMap";

type PresidentRow = { id: string; name: string; year_range: string };

type TravelRow = {
  id: string;
  event_name: string;
  destination_city: string;
  destination_country: string;
  latitude: number;
  longitude: number;
  event_date: string | null;
  members: { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null;
};

export default function AboutPage() {
  const { t } = useLanguage();
  const [historyMn, setHistoryMn] = useState("");
  const [historyEn, setHistoryEn] = useState("");
  const [presidents, setPresidents] = useState<PresidentRow[]>([]);
  const [travels, setTravels] = useState<TravelPoint[]>([]);

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
    supabase
      .from("member_travels")
      .select("id, event_name, destination_city, destination_country, latitude, longitude, event_date, members(first_name, last_name)")
      .then(({ data }) => {
        const rows = (data as unknown as TravelRow[]) ?? [];
        setTravels(
          rows.map((r) => {
            const m = Array.isArray(r.members) ? r.members[0] : r.members;
            return {
              id: r.id,
              event_name: r.event_name,
              destination_city: r.destination_city,
              destination_country: r.destination_country,
              latitude: r.latitude,
              longitude: r.longitude,
              event_date: r.event_date,
              memberName: m ? `${m.first_name} ${m.last_name}` : null,
            };
          })
        );
      });
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

      {/* The old "Дүрэмт клуб" info card (chartered blurb + duplicate
          PDF links) was redundant with the full certificate section
          below, which already shows the image and the same links —
          removed per the club's request. */}
      <div className="max-w-xl mb-14">
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
      </div>

      {/* Charter certificate — shown right on the page, not just as a
          download link, so anyone can see it without opening a new tab. */}
      <div className="mb-14">
        <h2 className="text-2xl font-bold text-rotary-royal-blue mb-4">
          {t("Клубын гэрчилгээ", "Charter Certificate", "認可証明書", "特许证书")}
        </h2>
        <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
          <Image
            src={asset("/certificates/rciu-charter-certificate.png")}
            alt={t("Клубын гэрчилгээ", "Charter Certificate", "認可証明書", "特许证书")}
            width={1600}
            height={1236}
            className="w-full h-auto"
          />
        </div>
        <a href={asset("/certificates/rciu-charter-certificate.pdf")} target="_blank" rel="noopener noreferrer" className="text-rotary-azure font-semibold hover:underline text-sm mt-2 inline-block">
          {t("Шинэ цонхонд нээх / татах", "Open in new tab / download", "新しいタブで開く / ダウンロード", "在新标签页打开 / 下载")}
        </a>
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
          <ol className="max-w-2xl rounded-xl overflow-hidden">
            {presidents.map((p, i) => (
              <li
                key={p.id}
                className={`flex items-center justify-between px-5 py-3 ${i % 2 === 0 ? "bg-slate-50" : "bg-white"}`}
              >
                <span className="font-semibold text-slate-900">{p.name}</span>
                <span className="text-sm text-slate-500">{p.year_range}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {travels.length > 0 && (
        <div className="mt-14">
          <h2 className="text-2xl font-bold text-rotary-royal-blue mb-2">
            {t("Бидний хүрсэн газрууд", "Where We've Traveled", "私たちが訪れた場所", "我们足迹所至")}
          </h2>
          <p className="text-slate-600 max-w-2xl mb-4">
            {t(
              "Клубын гишүүд олон улсын Ротари арга хэмжээнд оролцохоор дэлхийн өнцөг булан бүрт аялсаар байна.",
              "Our members travel around the world to take part in international Rotary events.",
              "当クラブの会員は国際ロータリー行事に参加するため世界各地を訪れています。",
              "我们的会员为参加国际扶轮活动而奔赴世界各地。"
            )}
          </p>
          <WorldTravelMap travels={travels} t={t} />
        </div>
      )}
    </div>
  );
}
