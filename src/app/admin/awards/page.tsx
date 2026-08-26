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
  award_date: string | null;
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

const EMPTY_ADMIN_AWARD = { title: "", award_date: "", comment: "" };

export default function AdminAwardsPage() {
  const { t } = useLanguage();
  const [items, setItems] = useState<AwardRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Status>("pending");

  // -- admin-added awards (bypasses the member-submission/review flow
  //    entirely — for club/district-level recognitions the club itself
  //    received, not tied to one member's own submission) ------------
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_ADMIN_AWARD);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function refresh() {
    const { data, error } = await supabase
      .from("club_awards")
      .select("id, title, comment, award_date, file_url, file_type, status, created_at, submitted_by, members!club_awards_submitted_by_fkey(first_name, last_name)")
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
    if (!confirm(t("Устгах уу?", "Delete this submission?", "削除しますか?", "確定刪除嗎?"))) return;
    await supabase.from("club_awards").delete().eq("id", item.id);
    refresh();
  }

  async function createAward(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFormError(null);

    let fileUrl: string | null = null;
    let fileType: "image" | "pdf" | null = null;
    if (file) {
      if (file.type.startsWith("image/")) fileType = "image";
      else if (file.type === "application/pdf") fileType = "pdf";
      else {
        setBusy(false);
        setFormError(t("Зөвхөн зураг эсвэл PDF файл байршуулна уу.", "Only image or PDF files are allowed.", "画像またはPDFファイルのみアップロードできます。", "僅支持上傳圖片或 PDF 文件。"));
        return;
      }
      const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
      const path = `awards/admin/${Date.now()}-${safeName}`;
      const { error: uploadError } = await supabase.storage.from("rciu-photos").upload(path, file);
      if (uploadError) {
        setBusy(false);
        setFormError(uploadError.message);
        return;
      }
      fileUrl = supabase.storage.from("rciu-photos").getPublicUrl(path).data.publicUrl;
    }

    // Added directly by an admin — goes straight to 'approved', no
    // moderation step needed (an admin adding it IS the approval).
    const { error: insertError } = await supabase.from("club_awards").insert({
      submitted_by: null,
      title: form.title,
      award_date: form.award_date || null,
      comment: form.comment || null,
      file_url: fileUrl,
      file_type: fileType,
      status: "approved",
    });
    setBusy(false);
    if (insertError) {
      setFormError(insertError.message);
      return;
    }
    setForm(EMPTY_ADMIN_AWARD);
    setFile(null);
    setShowForm(false);
    refresh();
  }

  const filtered = (items ?? []).filter((a) => a.status === tab);
  const pendingCount = (items ?? []).filter((a) => a.status === "pending").length;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-bold text-slate-900">{t("Шагнал ба алдар", "Awards & Recognition", "受賞・表彰", "獎項與榮譽")}</h2>
        <button onClick={() => setShowForm((v) => !v)} className="text-sm font-semibold bg-rotary-royal-blue text-white rounded-md px-4 py-2">
          {showForm ? t("Хаах", "Cancel", "キャンセル", "取消") : t("+ Шагнал нэмэх", "+ Add Award", "+ 受賞を追加", "+ 新增獎項")}
        </button>
      </div>
      <p className="text-sm text-slate-500 mb-6 max-w-2xl">
        {t(
          "Гишүүд дашбоардаас илгээсэн шагналын мэдээлэл — батлагдсан зөвхөн \"Бидний тухай\" хуудсанд харагдана. Мөн энд шууд шагнал нэмж болно — жишээ нь клуб/дүүргийн түвшний шагнал бол автоматаар батлагдана.",
          "Award/recognition entries members submit from their Dashboard — only approved ones show on the About page. You can also add one directly here (e.g. a club- or district-level award) — it's approved automatically since you're adding it yourself.",
          "会員がダッシュボードから投稿した受賞情報 — 承認されたもののみ「私たちについて」ページに表示されます。ここから直接追加することもできます（自動的に承認済みになります）。",
          "會員從個人主頁提交的獎項信息——僅已批准的會顯示在「關於我們」頁面。您也可以直接在此新增（例如俱樂部或分區級獎項）——由您新增的會自動批准。"
        )}
      </p>

      {showForm && (
        <form onSubmit={createAward} className="rounded-xl border border-slate-200 p-6 mb-8 grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <input required placeholder={t("Гарчиг", "Title", "タイトル", "標題")} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
            <input type="date" value={form.award_date} onChange={(e) => setForm({ ...form, award_date: e.target.value })} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <textarea placeholder={t("Тайлбар (заавал биш)", "Comment (optional)", "コメント(任意)", "說明(可選)")} value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} rows={2} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <div>
            <input type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-sm" />
            <p className="text-xs text-slate-400 mt-1">{t("Зураг эсвэл PDF (заавал биш)", "Photo or PDF (optional)", "写真またはPDF(任意)", "照片或 PDF(可選)")}</p>
          </div>
          {formError && <p className="text-sm text-rotary-cardinal">{formError}</p>}
          <button type="submit" disabled={busy} className="justify-self-start bg-rotary-royal-blue text-white font-semibold rounded-md px-5 py-2 text-sm disabled:opacity-60">
            {busy ? t("Хадгалж байна…", "Saving…", "保存中…", "保存中…") : t("Хадгалах", "Save", "保存", "保存")}
          </button>
        </form>
      )}

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
      {items === null && <p className="text-slate-400 text-sm">{t("Ачааллаж байна…", "Loading…", "読み込み中…", "加載中…")}</p>}
      {items && filtered.length === 0 && <p className="text-slate-400 text-sm">{t("Энд юу ч алга.", "Nothing here.", "ここには何もありません。", "暫無內容。")}</p>}

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
                  {m ? `${m.first_name} ${m.last_name}` : t("Админаас нэмсэн", "Added by admin", "管理者が追加", "管理員新增")}
                  {" · "}
                  {a.award_date ? new Date(a.award_date).toLocaleDateString() : new Date(a.created_at).toLocaleDateString()}
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
                    {t("Татгалзах", "Reject", "却下", "拒絕")}
                  </button>
                )}
                <button onClick={() => remove(a)} className="text-xs font-semibold px-3 py-1.5 rounded-md border border-rotary-cardinal text-rotary-cardinal hover:bg-rotary-cardinal hover:text-white">
                  {t("Устгах", "Delete", "削除", "刪除")}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
