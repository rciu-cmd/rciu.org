"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
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

  // Alphabetical, by first name then last name (matches how names are
  // displayed — "First Last") — sorted client-side so it's guaranteed
  // regardless of how the underlying view/query happens to order rows.
  const alphabetical = (members ?? [])
    .slice()
    .sort((a, b) => `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`));

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
          {alphabetical.map((m) => {
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
                  {/* Contact info moved up here from the honor roll —
                      still members-only (this whole page is login-gated). */}
                  <div className="text-xs text-slate-500 mt-1 flex flex-col gap-0.5">
                    {m.email && <span>{m.email}</span>}
                    {m.phone && <span>{m.phone}</span>}
                    {m.rotary_id && <span>Rotary ID: {m.rotary_id}</span>}
                  </div>
                  {m.phf_level !== "none" && (
                    <span
                      className="inline-flex items-center gap-1 mt-2 text-xs font-semibold px-2 py-0.5 rounded-full text-white"
                      style={{ background: theme.accent }}
                    >
                      <PhfPinBadge level={m.phf_level} size={16} majorDonor={m.major_donor} />
                      {theme.label}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
