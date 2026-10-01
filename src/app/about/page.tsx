"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { asset } from "@/lib/asset";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/language-context";
import { effectiveTheme } from "@/lib/phf";
import PhfPinBadge from "@/components/PhfPinBadge";
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
  member_travel_participants: { members: { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null }[] | null;
};

type AwardRow = {
  id: string;
  title: string;
  comment: string | null;
  award_date: string | null;
  file_url: string | null;
  file_type: "image" | "pdf" | null;
};

type HonorRollMember = {
  member_id: string;
  first_name: string;
  last_name: string;
  highest_position: string | null;
  honor_roll_priority: number | null;
  phf_level: string;
  major_donor: boolean;
};

function phfRank(level: string): number {
  const order = ["none", "PHF", "PHF+1", "PHF+2", "PHF+3", "PHF+4", "PHF+5", "PHF+6", "PHF+7", "PHF+8"];
  return order.indexOf(level);
}

export default function AboutPage() {
  const { t } = useLanguage();
  const [authed, setAuthed] = useState(false);
  const [historyMn, setHistoryMn] = useState("");
  const [historyEn, setHistoryEn] = useState("");
  const [presidents, setPresidents] = useState<PresidentRow[]>([]);
  const [travels, setTravels] = useState<TravelPoint[]>([]);
  const [awards, setAwards] = useState<AwardRow[]>([]);
  const [honorRoll, setHonorRoll] = useState<HonorRollMember[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setAuthed(!!session));

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
      .select("id, event_name, destination_city, destination_country, latitude, longitude, event_date, member_travel_participants(members(first_name, last_name))")
      .then(({ data }) => {
        const rows = (data as unknown as TravelRow[]) ?? [];
        setTravels(
          rows.map((r) => ({
            id: r.id,
            event_name: r.event_name,
            destination_city: r.destination_city,
            destination_country: r.destination_country,
            latitude: r.latitude,
            longitude: r.longitude,
            event_date: r.event_date,
            memberNames: (r.member_travel_participants ?? []).flatMap((p) => {
              const m = Array.isArray(p.members) ? p.members[0] : p.members;
              return m ? [`${m.first_name} ${m.last_name}`] : [];
            }),
          }))
        );
      });

    supabase
      .from("club_awards")
      .select("id, title, comment, award_date, file_url, file_type")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .then(({ data }) => setAwards((data as AwardRow[]) ?? []));

    // members_public (not members_directory) — this section is on a
    // public page now, no login required. Only carries what's already
    // safe for public display: no email/phone/address.
    supabase
      .from("members_public")
      .select("member_id, first_name, last_name, highest_position, honor_roll_priority, phf_level, major_donor")
      .then(({ data }) => setHonorRoll(((data as HonorRollMember[]) ?? []).filter((m) => m.phf_level !== "none")));
  }, []);

  const rankedHonorRoll = honorRoll.slice().sort((a, b) => {
    const pa = a.honor_roll_priority;
    const pb = b.honor_roll_priority;
    if (pa != null || pb != null) {
      if (pa == null) return 1;
      if (pb == null) return -1;
      if (pa !== pb) return pa - pb;
    }
    const rankDiff = phfRank(b.phf_level) - phfRank(a.phf_level);
    if (rankDiff !== 0) return rankDiff;
    return a.last_name.localeCompare(b.last_name);
  });

  return (
    <div className="container-page py-14">
      <h1 className="text-3xl font-bold text-rotary-royal-blue mb-3">
        {t("Бидний тухай", "About Us", "私たちについて", "關於我們", "소개")}
      </h1>
      <p className="text-slate-600 max-w-2xl mb-6">
        {t(
          "Их Өргөө Ротари Клуб нь Олон Улсын Ротари (Rotary International)-ийн албан ёсны гишүүн клуб бөгөөд дэлхийн Ротари гэр бүлийн нэг хэсэг болох 3450-р дүүргийн хүрээнд Улаанбаатар хотод үйлчилдэг.",
          "Rotary Club of Ikh Urgoo is an officially chartered member club of Rotary International, serving Ulaanbaatar as part of the worldwide Rotary family — District 3450.",
          "イク・ウルグー・ロータリークラブは、国際ロータリーに正式に加盟しているクラブです。世界中のロータリーファミリーの一員として、第3450地区でウランバートルの地域社会に奉仕しています。",
          "伊赫烏爾古扶輪社是國際扶輪正式授證的扶輪社，作為全球扶輪大家庭的一員，隸屬3450地區，服務烏蘭巴托。",
          "이흐 우르구 로타리클럽은 국제로타리의 정식 회원 클럽으로, 전 세계 로타리 가족의 일원으로서 3450지구에서 울란바토르 지역사회에 봉사하고 있습니다."
        )}
      </p>

      {/* Board is always public; Members (the login-gated roster +
          contact directory) only ever appears here as a button once
          the visitor is already signed in — otherwise it's simply not
          shown, rather than linking somewhere that just bounces them
          to the login page. */}
      <div className="flex flex-wrap gap-3 mb-10">
        <Link
          href="/board"
          className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-full border border-rotary-royal-blue text-rotary-royal-blue hover:bg-rotary-royal-blue hover:text-white transition-colors"
        >
          {t("Удирдлага", "Board", "理事会", "理事會", "이사회")} →
        </Link>
        {authed && (
          <Link
            href="/members"
            className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-full border border-rotary-royal-blue text-rotary-royal-blue hover:bg-rotary-royal-blue hover:text-white transition-colors"
          >
            {t("Гишүүд", "Members", "会員", "社友", "회원")} →
          </Link>
        )}
      </div>

      {/* Mission + Awards side by side — this is the "above the fold"
          pairing, so a first-time visitor sees the club's recognition
          highlights without having to scroll, not just buried at the
          bottom of the page. */}
      <div className="grid gap-6 lg:grid-cols-2 mb-14 items-start">
        <div className="rounded-xl border border-slate-200 p-6 h-full">
          <h2 className="font-bold text-rotary-royal-blue mb-2">
            {t("Эрхэм зорилго", "Our Mission", "私たちの使命", "我們的使命", "우리의 사명")}
          </h2>
          <p className="text-slate-600 text-sm">{t("Service Above Self", "Service Above Self", "超我の奉仕", "超我服務", "초아의 봉사")}</p>
        </div>

        <div className="rounded-xl border border-slate-200 p-6 h-full">
          <h2 className="font-bold text-rotary-royal-blue mb-2">
            {t("Шагнал ба алдар", "Awards & Recognition", "受賞・表彰", "獎項與榮譽", "수상 및 표창")}
          </h2>
          {awards.length === 0 ? (
            <p className="text-slate-400 text-sm">{t("Удахгүй…", "Coming soon…", "近日公開…", "即將推出…", "곧 공개됩니다…")}</p>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory">
              {awards.map((a) => (
                <a
                  key={a.id}
                  href={a.file_url ?? undefined}
                  target={a.file_url ? "_blank" : undefined}
                  rel="noopener noreferrer"
                  title={a.comment ?? a.title}
                  className="shrink-0 w-32 snap-start group"
                >
                  <div className="w-32 h-32 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 relative flex items-center justify-center group-hover:shadow-md transition">
                    {a.file_type === "image" && a.file_url ? (
                      <Image src={a.file_url} alt={a.title} fill className="object-cover" />
                    ) : a.file_type === "pdf" ? (
                      <span className="text-xs font-bold text-rotary-royal-blue">PDF</span>
                    ) : (
                      <Image src={asset("/logos/ri-gear-gold.png")} alt="" width={40} height={40} className="opacity-60" />
                    )}
                  </div>
                  <p className="text-xs font-semibold text-slate-800 mt-1.5 line-clamp-2">{a.title}</p>
                  {a.award_date && <p className="text-[10px] text-slate-400">{new Date(a.award_date).toLocaleDateString()}</p>}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Charter certificate — shown right on the page, not just as a
          download link, so anyone can see it without opening a new tab. */}
      <div className="mb-14">
        <h2 className="text-2xl font-bold text-rotary-royal-blue mb-4">
          {t("Клубын гэрчилгээ", "Charter Certificate", "加盟認証状", "授證證書", "클럽 인가증서")}
        </h2>
        <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
          <Image
            src={asset("/certificates/rciu-charter-certificate.png")}
            alt={t("Клубын гэрчилгээ", "Charter Certificate", "加盟認証状", "授證證書", "클럽 인가증서")}
            width={1600}
            height={1236}
            className="w-full h-auto"
          />
        </div>
        <a href={asset("/certificates/rciu-charter-certificate.pdf")} target="_blank" rel="noopener noreferrer" className="text-rotary-azure font-semibold hover:underline text-sm mt-2 inline-block">
          {t("Шинэ цонхонд нээх / татах", "Open in new tab / download", "新しいタブで開く / ダウンロード", "在新分頁開啟 / 下載", "새 탭에서 열기 / 다운로드")}
        </a>
      </div>

      {historyEn && (
        <div className="mb-14">
          <h2 className="text-2xl font-bold text-rotary-royal-blue mb-4">
            {t("Клубын түүх", "Our History", "クラブの歴史", "本社歷史", "클럽 역사")}
          </h2>
          <p className="text-slate-600 max-w-2xl">{t(historyMn, historyEn)}</p>
        </div>
      )}

      {presidents.length > 0 && (
        <div className="mb-14">
          <h2 className="text-2xl font-bold text-rotary-royal-blue mb-4">
            {t("Урьд өмнөх тэргүүнүүд", "Past Presidents", "歴代会長", "歷任社長", "역대 회장")}
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
        // id: the home page's "Our impact" travel numbers link here.
        <div id="travel" className="mb-14 scroll-mt-24">
          <h2 className="text-2xl font-bold text-rotary-royal-blue mb-2">
            {t("Бидний хүрсэн газрууд", "Where We've Traveled", "私たちが訪れた場所", "我們足跡所至", "우리가 다녀온 곳")}
          </h2>
          <p className="text-slate-600 max-w-2xl mb-4">
            {t(
              "Клубын гишүүд олон улсын Ротари арга хэмжээнд оролцохоор дэлхийн өнцөг булан бүрт аялсаар байна.",
              "Our members travel around the world to take part in international Rotary events.",
              "当クラブの会員は国際ロータリー行事に参加するため世界各地を訪れています。",
              "本社社友為參加國際扶輪活動而走訪世界各地。",
              "우리 클럽 회원들은 국제로타리 행사에 참가하기 위해 세계 곳곳을 방문하고 있습니다."
            )}
          </p>
          <WorldTravelMap travels={travels} t={t} />
        </div>
      )}

      {/* Paul Harris Fellow Honor Roll — moved here from the login-gated
          /members page so it's part of the club's public story. Dollar
          amounts are never shown, only recognition tier (same privacy
          rule as before the move). */}
      <section className="rounded-2xl bg-white border border-slate-200 text-rotary-royal-blue p-8">
        <div className="flex items-center gap-3 mb-2">
          <Image src={asset("/logos/ri-gear-gold.png")} alt="" width={32} height={32} />
          <h2 className="text-2xl font-bold">
            {t("Paul Harris Fellow алдрын самбар", "Paul Harris Fellow Honor Roll", "ポール・ハリス・フェロー名誉殿堂", "保羅·哈里斯之友榮譽榜", "폴 해리스 펠로우 명예의 전당")}
          </h2>
        </div>
        <p className="text-slate-500 text-sm mb-6 max-w-xl">
          {t(
            "Ротари Санд хувь нэмэр оруулсныг нь хүлээн зөвшөөрсөн клубын гишүүд, өндөр зэрэглэлээс бага руу эрэмбэлэгдсэн. Мөнгөн дүн энд харагдахгүй.",
            "Club members recognized for their contributions to The Rotary Foundation, ranked highest to lowest. Dollar amounts are kept private — only recognition tier is shown.",
            "ロータリー財団への貢献が認められた会員を、階級の高い順に表示しています。金額は非公開です。",
            "表彰對扶輪基金會有所貢獻的社友，依等級由高至低排列。捐款金額不予公開。",
            "로타리재단에 기여한 공로를 인정받은 회원들을 등급이 높은 순으로 보여 줍니다. 기부 금액은 공개하지 않습니다."
          )}
        </p>
        {rankedHonorRoll.length === 0 ? (
          <p className="text-slate-400 text-sm">{t("Удахгүй…", "Coming soon…", "近日公開…", "即將推出…", "곧 공개됩니다…")}</p>
        ) : (
          <ol className="flex flex-col divide-y divide-slate-100">
            {rankedHonorRoll.map((m, i) => (
              <li key={m.member_id} className="flex flex-wrap items-center gap-4 py-4">
                <span className="text-rotary-azure font-bold w-6 text-right shrink-0">{i + 1}</span>
                <PhfPinBadge level={m.phf_level} size={40} majorDonor={m.major_donor} />
                <div className="min-w-[10rem] flex-1">
                  <p className="font-semibold text-slate-900">
                    {m.first_name} {m.last_name}
                  </p>
                  {m.highest_position && <p className="text-xs text-rotary-azure">{m.highest_position}</p>}
                </div>
                <span
                  className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full text-white shrink-0"
                  style={{ background: effectiveTheme(m.phf_level, m.major_donor).accent }}
                >
                  {m.major_donor ? t("Их хандивлагч", "Major Donor", "メジャードナー", "巨額捐獻人", "고액 기부자") : m.phf_level}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
