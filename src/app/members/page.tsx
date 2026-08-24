"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { asset } from "@/lib/asset";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/language-context";
import { phfTheme } from "@/lib/phf";
import PhfPinBadge from "@/components/PhfPinBadge";

type DirectoryMember = {
  member_id: string;
  first_name: string;
  last_name: string;
  name_local: string | null;
  classification: string | null;
  position: string | null;
  photo_url: string | null;
  city: string | null;
  email: string | null;
  phone: string | null;
  rotary_id: string | null;
  highest_position: string | null;
  phf_level: string;
  major_donor: boolean;
};

export default function MembersPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [members, setMembers] = useState<DirectoryMember[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checkedAuth, setCheckedAuth] = useState(false);

  // Members-only page — guests get redirected to login instead of
  // seeing the roster/honor roll.
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace("/login/");
        return;
      }
      setCheckedAuth(true);
    });
  }, [router]);

  useEffect(() => {
    if (!checkedAuth) return;
    // members_directory (unlike members_public) includes email/phone —
    // it's granted to "authenticated" only, so this only works because
    // the visitor is already logged in, not because of the page gate above.
    supabase
      .from("members_directory")
      .select("*")
      .order("last_name")
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setMembers(data as DirectoryMember[]);
      });
  }, [checkedAuth]);

  if (!checkedAuth) {
    return <div className="container-page py-20 text-center text-slate-400">{t("Ачааллаж байна…", "Loading…", "読み込み中…", "加载中…")}</div>;
  }

  const honorRoll = (members ?? [])
    .filter((m) => m.phf_level !== "none")
    .sort((a, b) => phfRank(b.phf_level) - phfRank(a.phf_level));

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
                      className="inline-flex items-center gap-1 mt-2 text-xs font-semibold px-2 py-0.5 rounded-full text-white"
                      style={{ background: theme.accent }}
                    >
                      <PhfPinBadge level={m.phf_level} size={16} />
                      {theme.label}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Honor roll — ranked top to bottom by recognition level, with
          contact info. Visible to logged-in members only (this page
          and the members_directory view are both login-gated), so
          this is a members' contact directory, not a public listing. */}
      <section className="rounded-2xl bg-gradient-to-br from-[#0d2c5c] to-rotary-royal-blue text-white p-8">
        <div className="flex items-center gap-3 mb-2">
          <Image src={asset("/logos/ri-gear-logo.png")} alt="" width={32} height={32} />
          <h2 className="text-2xl font-bold">
            {t("Paul Harris Fellow алдрын самбар", "Paul Harris Fellow Honor Roll", "ポール・ハリス・フェロー 名誉殿堂", "保罗·哈里斯会员荣誉榜")}
          </h2>
        </div>
        <p className="text-blue-100 text-sm mb-6 max-w-xl">
          {t(
            "The Rotary Foundation-д хувь нэмэр оруулсныг нь хүлээн зөвшөөрсөн клубын гишүүд, өндөр зэрэглэлээс бага руу эрэмбэлэгдсэн. Мөнгөн дүн энд харагдахгүй.",
            "Club members recognized for their contributions to The Rotary Foundation, ranked highest to lowest. Dollar amounts are kept private — only recognition tier is shown.",
            "ロータリー財団への貢献が認められた会員を、階級の高い順に表示しています。金額は非公開です。",
            "表彰对扶轮基金会做出贡献的会员,按级别从高到低排列。捐款金额不公开显示。"
          )}
        </p>
        {honorRoll.length === 0 ? (
          <p className="text-blue-100 text-sm">{t("Удахгүй…", "Coming soon…", "近日公開…", "即将上线…")}</p>
        ) : (
          <ol className="flex flex-col divide-y divide-white/10">
            {honorRoll.map((m, i) => (
              <li key={m.member_id} className="flex flex-wrap items-center gap-4 py-4">
                <span className="text-blue-200 font-bold w-6 text-right shrink-0">{i + 1}</span>
                <PhfPinBadge level={m.phf_level} size={40} />
                <div className="min-w-[10rem] flex-1">
                  <p className="font-semibold">
                    {m.first_name} {m.last_name}
                    {m.major_donor && (
                      <span className="ml-2 text-rotary-gold text-xs font-bold align-middle">★ {t("Их хандивлагч", "Major Donor", "メジャードナー", "重要捐赠人")}</span>
                    )}
                  </p>
                  {m.highest_position && <p className="text-xs text-blue-200">{m.highest_position}</p>}
                </div>
                <div className="text-xs text-blue-100 flex flex-col gap-0.5 min-w-[11rem]">
                  {m.email && <span>{m.email}</span>}
                  {m.phone && <span>{m.phone}</span>}
                  {m.rotary_id && <span className="text-blue-300">Rotary ID: {m.rotary_id}</span>}
                </div>
                <span
                  className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full shrink-0"
                  style={{ background: phfTheme(m.phf_level).accent }}
                >
                  {m.phf_level}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function phfRank(level: string): number {
  const order = ["none", "PHF", "PHF+1", "PHF+2", "PHF+3", "PHF+4", "PHF+5", "PHF+6", "PHF+7", "PHF+8"];
  return order.indexOf(level);
}
