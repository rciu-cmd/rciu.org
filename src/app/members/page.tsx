"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { asset } from "@/lib/asset";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/language-context";
import { phfTheme } from "@/lib/phf";

type PublicMember = {
  member_id: string;
  first_name: string;
  last_name: string;
  name_local: string | null;
  classification: string | null;
  position: string | null;
  photo_url: string | null;
  city: string | null;
  phf_level: string;
  major_donor: boolean;
};

export default function MembersPage() {
  const { t } = useLanguage();
  const [members, setMembers] = useState<PublicMember[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("members_public")
      .select("*")
      .order("last_name")
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setMembers(data as PublicMember[]);
      });
  }, []);

  const honorRoll = (members ?? []).filter((m) => m.phf_level !== "none");

  return (
    <div className="container-page py-14">
      <h1 className="text-3xl font-bold text-rotary-royal-blue mb-3">
        {t("Гишүүд", "Our Members", "会員紹介", "我们的会员")}
      </h1>
      <p className="text-slate-600 max-w-2xl mb-10">
        {t(
          "Rotary Club of Ikh Urgoo-ийн идэвхтэй гишүүдийн жагсаалт.",
          "The active members of Rotary Club of Ikh Urgoo.",
          "イクー・ウルグー・ロータリークラブの現役会員です。",
          "扶轮伊赫乌尔古俱乐部的活跃会员。"
        )}
      </p>

      {error && (
        <p className="text-sm text-rotary-cardinal mb-6">
          {t("Гишүүдийн мэдээлэл ачаалахад алдаа гарлаа.", "Couldn't load member data.", "会員データを読み込めませんでした。", "无法加载会员数据。")}
          {" "}({error})
        </p>
      )}

      {!members && !error && (
        <p className="text-slate-400 text-sm">{t("Ачааллаж байна…", "Loading…", "読み込み中…", "加载中…")}</p>
      )}

      {members && members.length === 0 && (
        <p className="text-slate-400 text-sm">
          {t(
            "Гишүүдийн мэдээлэл удахгүй нэмэгдэнэ.",
            "Member profiles will appear here once the database is populated.",
            "データベースが登録され次第、会員プロフィールが表示されます。",
            "数据库填充完成后,会员资料将显示在此处。"
          )}
        </p>
      )}

      {members && members.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-16">
          {members.map((m) => {
            const theme = phfTheme(m.phf_level);
            return (
              <div key={m.member_id} className="rounded-xl border border-slate-200 p-5 shadow-sm flex gap-4 items-start">
                <div
                  className="w-14 h-14 rounded-full shrink-0 flex items-center justify-center text-white font-bold text-lg"
                  style={{ background: m.photo_url ? undefined : theme.accent }}
                >
                  {m.photo_url ? (
                    <Image src={m.photo_url} alt="" width={56} height={56} className="rounded-full object-cover" />
                  ) : (
                    `${m.first_name?.[0] ?? ""}${m.last_name?.[0] ?? ""}`
                  )}
                </div>
                <div>
                  <p className="font-bold text-slate-900">{m.first_name} {m.last_name}</p>
                  {m.position && <p className="text-sm text-slate-500">{m.position}</p>}
                  {m.classification && <p className="text-xs text-slate-400">{m.classification}</p>}
                  {m.phf_level !== "none" && (
                    <span
                      className="inline-block mt-2 text-xs font-semibold px-2 py-0.5 rounded-full text-white"
                      style={{ background: theme.accent }}
                    >
                      {theme.label}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Public honor roll — names + PHF tier only, never dollar amounts */}
      <section className="rounded-2xl bg-gradient-to-br from-[#0d2c5c] to-rotary-royal-blue text-white p-8">
        <div className="flex items-center gap-3 mb-2">
          <Image src={asset("/logos/ri-gear-logo.png")} alt="" width={32} height={32} />
          <h2 className="text-2xl font-bold">
            {t("Paul Harris Fellow алдрын самбар", "Paul Harris Fellow Honor Roll", "ポール・ハリス・フェロー 名誉殿堂", "保罗·哈里斯会员荣誉榜")}
          </h2>
        </div>
        <p className="text-blue-100 text-sm mb-6 max-w-xl">
          {t(
            "The Rotary Foundation-д хувь нэмэр оруулсныг нь хүлээн зөвшөөрсөн клубын гишүүд. Мөнгөн дүн энд харагдахгүй.",
            "Recognizing club members for their contributions to The Rotary Foundation. Dollar amounts are kept private — only recognition tier is shown.",
            "ロータリー財団への貢献が認められた会員を称えます。金額は非公開です。",
            "表彰对扶轮基金会做出贡献的会员。捐款金额不公开显示。"
          )}
        </p>
        {honorRoll.length === 0 ? (
          <p className="text-blue-100 text-sm">{t("Удахгүй…", "Coming soon…", "近日公開…", "即将上线…")}</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {honorRoll
              .sort((a, b) => phfRank(b.phf_level) - phfRank(a.phf_level))
              .map((m) => {
                const theme = phfTheme(m.phf_level);
                return (
                  <li key={m.member_id} className="bg-white/10 rounded-lg px-4 py-3 flex items-center justify-between">
                    <span className="font-medium">
                      {m.first_name} {m.last_name}
                      {m.major_donor && (
                        <span className="ml-2 text-rotary-gold text-xs font-bold">★ {t("Их хандивлагч", "Major Donor", "メジャードナー", "重要捐赠人")}</span>
                      )}
                    </span>
                    <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background: theme.accent }}>
                      {m.phf_level}
                    </span>
                  </li>
                );
              })}
          </ul>
        )}
      </section>
    </div>
  );
}

function phfRank(level: string): number {
  const order = ["none","PHF","PHF+1","PHF+2","PHF+3","PHF+4","PHF+5","PHF+6","PHF+7","PHF+8"];
  return order.indexOf(level);
}
