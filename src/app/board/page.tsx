"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/language-context";

type BoardRow = {
  id: string;
  role_mn: string;
  role_en: string;
  role_ja: string | null;
  role_zh: string | null;
  rotary_year: string;
  photo_url: string | null;
  members: { first_name: string; last_name: string; photo_url: string | null } | null;
};

export default function BoardPage() {
  const { t } = useLanguage();
  const [rows, setRows] = useState<BoardRow[] | null>(null);

  useEffect(() => {
    supabase
      .from("board_positions")
      .select("id, role_mn, role_en, role_ja, role_zh, rotary_year, photo_url, members(first_name, last_name, photo_url)")
      .order("sort_order")
      .then(({ data }) => setRows((data as unknown as BoardRow[]) ?? []));
  }, []);

  // Show only the most recent Rotary year — without this, every board
  // ever entered (past + current) showed at once, which read as
  // duplicated/repeated names for anyone who'd served more than once.
  const currentYear = rows && rows.length > 0 ? rows.reduce((max, r) => (r.rotary_year > max ? r.rotary_year : max), rows[0].rotary_year) : null;
  const currentRows = rows?.filter((r) => r.rotary_year === currentYear) ?? [];

  // Sort order already encodes Rotary protocol (President=1, VP=2,
  // Secretary General=3, ...) — the top 3 get the prominent
  // photo treatment; everyone else is listed plainly below, for a
  // cleaner, more professional look than a uniform grid of circles.
  const leadership = currentRows.slice(0, 3);
  const rest = currentRows.slice(3);

  return (
    <div className="container-page py-14">
      <h1 className="text-3xl font-bold text-rotary-royal-blue mb-3">
        {t("Удирдлага", "Board of Directors", "役員", "理事会")}
      </h1>
      <p className="text-slate-600 max-w-2xl mb-1">
        {t(
          "Rotary жилийн удирдлагын багийн бүрэлдэхүүн.",
          "The club's leadership team for the current Rotary year.",
          "現ロータリー年度のクラブ役員です。",
          "本扶轮年度俱乐部理事会成员。"
        )}
      </p>
      {currentYear && <p className="text-sm text-rotary-azure font-semibold mb-10">{currentYear}</p>}

      {rows === null && <p className="text-slate-400 text-sm">{t("Ачааллаж байна…", "Loading…", "読み込み中…", "加载中…")}</p>}

      {rows && currentRows.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
          <p className="mb-1 font-medium">
            {t("Удирдлагын бүрэлдэхүүн удахгүй нэмэгдэнэ.", "Board roles will be published here soon.", "役員情報は近日公開予定です。", "理事会成员名单即将公布。")}
          </p>
          <p className="text-sm">
            {t(
              "Admin самбараас нэмэх боломжтой.",
              "Admins can add board positions from the admin dashboard once officer titles are confirmed.",
              "役職が確定次第、管理者ダッシュボードから追加できます。",
              "职位确认后,管理员可从后台添加理事会成员。"
            )}
          </p>
        </div>
      )}

      {leadership.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-3 mb-10">
          {leadership.map((r) => {
            const photo = r.photo_url ?? r.members?.photo_url ?? null;
            return (
              <div key={r.id} className="rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition text-center">
                <div className="w-24 h-24 mx-auto rounded-full bg-blue-50 shrink-0 overflow-hidden flex items-center justify-center mb-4">
                  {photo ? (
                    <Image src={photo} alt="" width={96} height={96} className="object-cover w-full h-full" />
                  ) : (
                    <span className="text-2xl font-bold text-rotary-royal-blue">
                      {r.members?.first_name?.[0]}{r.members?.last_name?.[0]}
                    </span>
                  )}
                </div>
                <p className="font-bold text-slate-900">
                  {r.members?.first_name} {r.members?.last_name}
                </p>
                <p className="text-rotary-royal-blue text-sm font-semibold">
                  {t(r.role_mn, r.role_en, r.role_ja ?? undefined, r.role_zh ?? undefined)}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {rest.length > 0 && (
        <div className="rounded-xl border border-slate-200 divide-y divide-slate-100">
          {rest.map((r) => (
            <div key={r.id} className="flex items-center justify-between px-5 py-3.5">
              <span className="font-medium text-slate-900">
                {r.members?.first_name} {r.members?.last_name}
              </span>
              <span className="text-slate-500 text-sm text-right">
                {t(r.role_mn, r.role_en, r.role_ja ?? undefined, r.role_zh ?? undefined)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
