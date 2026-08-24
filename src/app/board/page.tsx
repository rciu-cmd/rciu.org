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

  return (
    <div className="container-page py-14">
      <h1 className="text-3xl font-bold text-rotary-royal-blue mb-3">
        {t("Удирдлага", "Board of Directors", "役員", "理事会")}
      </h1>
      <p className="text-slate-600 max-w-2xl mb-10">
        {t(
          "Rotary жилийн удирдлагын багийн бүрэлдэхүүн.",
          "The club's leadership team for the current Rotary year.",
          "現ロータリー年度のクラブ役員です。",
          "本扶轮年度俱乐部理事会成员。"
        )}
      </p>

      {rows === null && <p className="text-slate-400 text-sm">{t("Ачааллаж байна…", "Loading…", "読み込み中…", "加载中…")}</p>}

      {rows && rows.length === 0 && (
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

      {rows && rows.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => {
            const photo = r.photo_url ?? r.members?.photo_url ?? null;
            return (
              <div key={r.id} className="rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition flex gap-4 items-center">
                <div className="w-16 h-16 rounded-full bg-blue-50 shrink-0 overflow-hidden flex items-center justify-center">
                  {photo ? (
                    <Image src={photo} alt="" width={64} height={64} className="object-cover w-full h-full" />
                  ) : (
                    <span className="text-lg font-bold text-rotary-royal-blue">
                      {r.members?.first_name?.[0]}{r.members?.last_name?.[0]}
                    </span>
                  )}
                </div>
                <div>
                  <p className="font-bold text-slate-900">
                    {r.members?.first_name} {r.members?.last_name}
                  </p>
                  <p className="text-rotary-royal-blue text-sm font-semibold">
                    {t(r.role_mn, r.role_en, r.role_ja ?? undefined, r.role_zh ?? undefined)}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">{r.rotary_year}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
