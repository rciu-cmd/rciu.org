"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/language-context";

type Status = "pending" | "approved" | "rejected";

type AwardRow = {
  id: string;
  title: string;
  comment: string | null;
  file_url: string | null;
  file_type: "image" | "pdf" | null;
  status: Status;
  created_at: string;
  submitted_by: string | null;
  members: { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null;
};

const TABS: { key: Status; mn: string; en: string }[] = [
  { key: "pending", mn: "Хянагдаж буй", en: "Pending" },
  { key: "approved", mn: "Батлагдсан", en: "Approved" },
  { key: "rejected", mn: "Татгалзсан", en: "Rejected" },
];

export default function AdminAwardsPage() {
  const { t } = useLanguage();
  const [items, setItems] = useState<AwardRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Status>("pending");

  async function refresh() {
    const { data, error } = await supabase
      .from("club_awards")
      .select("id, title, comment, file_url, file_type, status, created_at, submitted_by, members(first_name, last_name)")
      .order("created_at", { ascending: false });
    if (error) setError(error.message);
    else setItems(data as unknown as AwardRow[]);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function setStatus(item: AwardRow, status: Status) {
    await supabase.from("club_awards").update({ status }).eq("id", item.id);
    refresh();
  }

  async function remove(item: AwardRow) {
    if (!confirm(t("Устгах уу?", "Delete this submission?", "削除しますか?", "确定删除吗?"))) return;
    await supabase.from("club_awards").delete().eq("id", item.id);
    refresh();
  }

  const filtered = (items ?? []).filter((a) => a.status === tab);
  const pendingCount = (items ?? []).filter((a) => a.status === "pending").length;

  return (
    <div>
      <h2 className="text-xl font-bold text-slate-900 mb-2">{t("Шагнал ба алдар", "Awards & Recognition", "受賞・表彰", "奖项与荣誉")}</h2>
      <p className="text-sm text-slate-500 mb-6 max-w-2xl">
        {t(
          "Гишүүд дашбоардаас илгээсэн шагналын мэдээлэл — батлагдсан зөвхөн \"Бидний тухай\" хуудсанд харагдана.",
          "Award/recognition entries members submit from their Dashboard — only approved ones show on the About page.",
          "会員がダッシュボードから投稿した受賞情報 — 承認されたもののみ「私たちについて」ページに表示されます。",
          "会员从个人主页提交的奖项信息——仅已批准的会显示在「关于我们」页面。"
        )}
      </p>

      <div className="mb-6 flex gap-1 rounded-lg border border-slate-200 p-1 text-sm font-semibold w-fit">
        {TABS.map((tb) => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            className={`rounded-md px-4 py-1.5 transition-colors ${tab === tb.key ? "bg-rotary-royal-blue text-white" : "text-slate-600"}`}
          >
            {t(tb.mn, tb.en)}
            {tb.key === "pending" && pendingCount > 0 && (
              <span className={`ml-1.5 text-xs ${tab === tb.key ? "text-white/80" : "text-rotary-cardinal"}`}>({pendingCount})</span>
            )}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-rotary-cardinal mb-4">{error}</p>}
      {items === null && <p className="text-slate-400 text-sm">{t("Ачааллаж байна…", "Loading…", "読み込み中…", "加载中…")}</p>}
      {items && filtered.length === 0 && <p className="text-slate-400 text-sm">{t("Энд юу ч алга.", "Nothing here.", "ここには何もありません。", "暂无内容。")}</p>}

      <div className="grid gap-3">
        {filtered.map((a) => {
          const m = Array.isArray(a.members) ? a.members[0] : a.members;
          return (
            <div key={a.id} className="rounded-xl border border-slate-200 p-5 flex items-start gap-4">
              <div className="w-20 h-20 rounded-lg overflow-hidden bg-slate-100 shrink-0 flex items-center justify-center">
                {a.file_type === "image" && a.file_url ? (
                  <Image src={a.file_url} alt="" width={80} height={80} className="object-cover w-20 h-20" />
                ) : a.file_type === "pdf" && a.file_url ? (
                  <a href={a.file_url} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-rotary-royal-blue underline">
                    PDF
                  </a>
                ) : (
                  <span className="text-xs text-slate-400">—</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-900">{a.title}</p>
                <p className="text-sm text-slate-500">
                  {m ? `${m.first_name} ${m.last_name}` : t("Тодорхойгүй гишүүн", "Unknown member")}
                  {" · "}
                  {new Date(a.created_at).toLocaleDateString()}
                </p>
                {a.comment && <p className="text-sm text-slate-600 mt-2 max-w-lg">{a.comment}</p>}
              </div>
              <div className="flex flex-col gap-2 items-end shrink-0">
                {a.status !== "approved" && (
                  <button onClick={() => setStatus(a, "approved")} className="text-xs font-semibold px-3 py-1.5 rounded-md bg-green-600 text-white hover:bg-green-700">
                    {t("Батлах", "Approve", "承認", "批准")}
                  </button>
                )}
                {a.status !== "rejected" && (
                  <button onClick={() => setStatus(a, "rejected")} className="text-xs font-semibold px-3 py-1.5 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50">
                    {t("Татгалзах", "Reject", "却下", "拒绝")}
                  </button>
                )}
                <button onClick={() => remove(a)} className="text-xs font-semibold px-3 py-1.5 rounded-md border border-rotary-cardinal text-rotary-cardinal hover:bg-rotary-cardinal hover:text-white">
                  {t("Устгах", "Delete", "削除", "删除")}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
