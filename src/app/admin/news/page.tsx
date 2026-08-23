"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/language-context";

type NewsRow = {
  id: string;
  title_mn: string;
  title_en: string;
  body_mn: string;
  body_en: string;
  cover_image_url: string | null;
  status: "draft" | "published";
  published_at: string | null;
};

const EMPTY = { title_mn: "", title_en: "", body_mn: "", body_en: "", cover_image_url: "" };

export default function AdminNewsPage() {
  const { t } = useLanguage();
  const [items, setItems] = useState<NewsRow[] | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function refresh() {
    const { data, error } = await supabase.from("news").select("*").order("created_at", { ascending: false });
    if (error) setError(error.message);
    else setItems(data as NewsRow[]);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function createPost(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.from("news").insert({
      title_mn: form.title_mn,
      title_en: form.title_en,
      body_mn: form.body_mn,
      body_en: form.body_en,
      cover_image_url: form.cover_image_url || null,
      status: "draft",
    });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setForm(EMPTY);
    setShowForm(false);
    refresh();
  }

  async function togglePublish(item: NewsRow) {
    const nowPublishing = item.status !== "published";
    await supabase
      .from("news")
      .update({
        status: nowPublishing ? "published" : "draft",
        published_at: nowPublishing ? new Date().toISOString() : item.published_at,
      })
      .eq("id", item.id);
    refresh();
  }

  async function remove(item: NewsRow) {
    if (!confirm(t("Устгах уу?", "Delete this post?", "削除しますか?", "确定删除吗?"))) return;
    await supabase.from("news").delete().eq("id", item.id);
    refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-900">{t("Мэдээ удирдах", "Manage News", "ニュース管理", "新闻管理")}</h2>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="text-sm font-semibold bg-rotary-royal-blue text-white rounded-md px-4 py-2"
        >
          {showForm ? t("Хаах", "Cancel", "キャンセル", "取消") : t("+ Шинэ мэдээ", "+ New Post", "+ 新規投稿", "+ 新建")}
        </button>
      </div>

      {showForm && (
        <form onSubmit={createPost} className="rounded-xl border border-slate-200 p-6 mb-8 grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <input required placeholder={t("Гарчиг (MN)", "Title (MN)", "タイトル(MN)", "标题(MN)")} value={form.title_mn} onChange={(e) => setForm({ ...form, title_mn: e.target.value })} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
            <input required placeholder={t("Гарчиг (EN)", "Title (EN)", "タイトル(EN)", "标题(EN)")} value={form.title_en} onChange={(e) => setForm({ ...form, title_en: e.target.value })} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <textarea required placeholder={t("Агуулга (MN)", "Body (MN)", "本文(MN)", "正文(MN)")} value={form.body_mn} onChange={(e) => setForm({ ...form, body_mn: e.target.value })} rows={4} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <textarea required placeholder={t("Агуулга (EN)", "Body (EN)", "本文(EN)", "正文(EN)")} value={form.body_en} onChange={(e) => setForm({ ...form, body_en: e.target.value })} rows={4} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input placeholder={t("Зургийн URL (заавал биш)", "Cover image URL (optional)", "カバー画像URL(任意)", "封面图片URL(可选)")} value={form.cover_image_url} onChange={(e) => setForm({ ...form, cover_image_url: e.target.value })} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          {error && <p className="text-sm text-rotary-cardinal">{error}</p>}
          <button type="submit" disabled={busy} className="justify-self-start bg-rotary-royal-blue text-white font-semibold rounded-md px-5 py-2 text-sm disabled:opacity-60">
            {busy ? t("Хадгалж байна…", "Saving…", "保存中…", "保存中…") : t("Ноорог хадгалах", "Save as Draft", "下書き保存", "保存为草稿")}
          </button>
        </form>
      )}

      {items === null && <p className="text-slate-400 text-sm">{t("Ачааллаж байна…", "Loading…", "読み込み中…", "加载中…")}</p>}
      {items && items.length === 0 && <p className="text-slate-400 text-sm">{t("Мэдээ алга.", "No posts yet.", "投稿がありません。", "暂无文章。")}</p>}

      <div className="grid gap-4">
        {items?.map((item) => (
          <div key={item.id} className="rounded-xl border border-slate-200 p-5 flex items-start justify-between gap-4">
            <div>
              <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full mb-1 ${item.status === "published" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                {item.status === "published" ? t("Нийтэлсэн", "Published", "公開済み", "已发布") : t("Ноорог", "Draft", "下書き", "草稿")}
              </span>
              <p className="font-bold text-slate-900">{item.title_en}</p>
              <p className="text-sm text-slate-500 line-clamp-2">{item.body_en}</p>
            </div>
            <div className="flex flex-col gap-2 shrink-0">
              <button onClick={() => togglePublish(item)} className="text-xs font-semibold px-3 py-1.5 rounded-md border border-rotary-royal-blue text-rotary-royal-blue hover:bg-rotary-royal-blue hover:text-white">
                {item.status === "published" ? t("Ноорог болгох", "Unpublish", "非公開にする", "撤回发布") : t("Нийтлэх", "Publish", "公開する", "发布")}
              </button>
              <button onClick={() => remove(item)} className="text-xs font-semibold px-3 py-1.5 rounded-md border border-rotary-cardinal text-rotary-cardinal hover:bg-rotary-cardinal hover:text-white">
                {t("Устгах", "Delete", "削除", "删除")}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
