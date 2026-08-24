"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/language-context";

type ProjectRow = {
  id: string;
  title_mn: string;
  title_en: string;
  description_mn: string | null;
  description_en: string | null;
  status: string;
  cover_image_url: string | null;
  funding_amount: number | null;
  funding_currency: string;
  grant_number: string | null;
};

export default function ProjectsPage() {
  const { t } = useLanguage();
  const [items, setItems] = useState<ProjectRow[] | null>(null);

  useEffect(() => {
    supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => setItems((data as ProjectRow[]) ?? []));
  }, []);

  return (
    <div className="container-page py-14">
      <h1 className="text-3xl font-bold text-rotary-royal-blue mb-3">
        {t("Төслүүд", "Projects", "プロジェクト", "项目")}
      </h1>
      <p className="text-slate-600 max-w-2xl mb-10">
        {t("Клубын хэрэгжүүлж буй болон дуусгасан төслүүд.", "Ongoing and completed community service projects.", "実施中および完了したコミュニティ・サービス・プロジェクト。", "正在进行和已完成的社区服务项目。")}
      </p>

      {items === null && <p className="text-slate-400 text-sm">{t("Ачааллаж байна…", "Loading…", "読み込み中…", "加载中…")}</p>}

      {items && items.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
          {t(
            "Төслийн мэдээлэл удахгүй нэмэгдэнэ.",
            "Project details will appear here once added by an admin.",
            "プロジェクト情報は管理者が追加次第、表示されます。",
            "项目信息将在管理员添加后显示。"
          )}
        </div>
      )}

      {items && items.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => (
            <article key={p.id} className="rounded-xl border border-slate-200 p-6 shadow-sm">
              <span className="inline-block text-xs font-semibold uppercase tracking-wide text-rotary-azure mb-2">
                {p.status}
              </span>
              <h2 className="font-bold text-slate-900 mb-2">{t(p.title_mn, p.title_en)}</h2>
              {p.description_en && <p className="text-slate-600 text-sm line-clamp-3">{t(p.description_mn ?? "", p.description_en)}</p>}
              {p.funding_amount != null && (
                <p className="text-sm text-rotary-azure font-semibold mt-3">
                  {p.funding_currency} {p.funding_amount.toLocaleString()}
                  {p.grant_number && ` · ${p.grant_number}`}
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
