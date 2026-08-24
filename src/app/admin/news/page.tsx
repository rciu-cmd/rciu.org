"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/language-context";

type NewsRow = {
  id: string;
  title_mn: string | null;
  title_en: string | null;
  body_mn: string | null;
  body_en: string | null;
  cover_image_url: string | null;
  facebook_url: string | null;
  status: "draft" | "published";
  published_at: string | null;
};

type PostMode = "facebook" | "written";

const EMPTY = { title_mn: "", title_en: "", body_mn: "", body_en: "", cover_image_url: "" };

export default function AdminNewsPage() {
  const { t } = useLanguage();
  const [items, setItems] = useState<NewsRow[] | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [facebookUrl, setFacebookUrl] = useState("");
  const [mode, setMode] = useState<PostMode>("facebook");
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
    const payload: {
      facebook_url: string | null;
      title_mn: string | null;
      title_en: string | null;
      body_mn: string | null;
      body_en: string | null;
      cover_image_url: string | null;
      status: "draft";
    } =
      mode === "facebook"
        ? { facebook_url: facebookUrl.trim(), title_mn: null, title_en: null, body_mn: null, body_en: null, cover_image_url: null, status: "draft" }
        : {
            facebook_url: null,
            title_mn: form.title_mn,
            title_en: form.title_en,
            body_mn: form.body_mn,
            body_en: form.body_en,
            cover_image_url: form.cover_image_url || null,
            status: "draft",
          };
    const { error } = await supabase.from("news").insert(payload);
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setForm(EMPTY);
    setFacebookUrl("");
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
        <div className="rounded-xl border border-slate-200 p-6 mb-8">
          <div className="mb-4 grid grid-cols-2 rounded-lg border border-slate-200 p-1 text-sm font-semibold w-fit">
            <button
              type="button"
              onClick={() => setMode("facebook")}
              className={`rounded-md px-4 py-1.5 transition-colors ${mode === "facebook" ? "bg-rotary-royal-blue text-white" : "text-slate-600"}`}
            >
              {t("Facebook холбоос", "Facebook Link", "Facebookリンク", "Facebook链接")}
            </button>
            <button
              type="button"
              onClick={() => setMode("written")}
              className={`rounded-md px-4 py-1.5 transition-colors ${mode === "written" ? "bg-rotary-royal-blue text-white" : "text-slate-600"}`}
            >
              {t("Бичих", "Write Post", "投稿を書く", "手动撰写")}
            </button>
          </div>

          {mode === "facebook" ? (
            <form onSubmit={createPost} className="grid gap-3">
              <p className="text-sm text-slate-500">
                {t(
                  "Клубын Facebook пост-ын холбоосыг тавихад л зураг, видео, бичвэрийн хамт бүтнээр нь мэдээ хуудсанд харагдана.",
                  "Paste the link to a public post on the club's Facebook Page — it will show up on the News page as the full post, photos/video included.",
                  "クラブのFacebook投稿のリンクを貼るだけで、写真・動画・本文がそのままニュースページに表示されます。",
                  "只需粘贴俱乐部 Facebook 帖子的链接,照片、视频和文字都会完整显示在新闻页面上。"
                )}
              </p>
              <p className="text-xs text-slate-400 -mt-1">
                {t(
                  "Facebook-ын \"Хуваалцах\" товчнаас гарсан холбоос биш, пост дээрх огноог дарж гарч ирэх жинхэнэ холбоосыг ашиглана уу (мөн пост нь \"Нийтэд\" харагдах ёстой).",
                  "Use the post's own permalink — click the timestamp on the post to open it, then copy that URL. Don't use the link from Facebook's \"Share\" button, and make sure the post's audience is set to Public.",
                  "Facebookの「シェア」ボタンのリンクではなく、投稿の日付をクリックして開いたページの本来のURLを使ってください(投稿は「公開」設定である必要があります)。",
                  "请使用帖子本身的永久链接(点击帖子上的时间戳打开后复制该网址),不要使用 Facebook「分享」按钮生成的链接,并确保帖子可见范围为「公开」。"
                )}
              </p>
              <input
                required
                type="url"
                placeholder="https://www.facebook.com/RotaryClubOfIkhUrgoo/posts/..."
                value={facebookUrl}
                onChange={(e) => setFacebookUrl(e.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              {/facebook\.com\/share\//i.test(facebookUrl) && (
                <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                  {t(
                    "⚠️ Энэ бол \"Хуваалцах\" холбоос бөгөөд ихэвчлэн ажилладаггүй. Пост дээрх огноог дарж гарах жинхэнэ холбоосыг ашиглана уу.",
                    "⚠️ This looks like a Facebook \"Share\" link, which usually fails to embed. Open the post and copy the link from its timestamp instead.",
                    "⚠️ これはFacebookの「シェア」リンクのようです。通常埋め込みに失敗します。投稿の日付リンクからURLを取得してください。",
                    "⚠️ 这看起来是 Facebook 的「分享」链接,通常无法正常嵌入。请改用点击帖子时间戳获得的链接。"
                  )}
                </p>
              )}
              {error && <p className="text-sm text-rotary-cardinal">{error}</p>}
              <button type="submit" disabled={busy} className="justify-self-start bg-rotary-royal-blue text-white font-semibold rounded-md px-5 py-2 text-sm disabled:opacity-60">
                {busy ? t("Хадгалж байна…", "Saving…", "保存中…", "保存中…") : t("Ноорог хадгалах", "Save as Draft", "下書き保存", "保存为草稿")}
              </button>
            </form>
          ) : (
            <form onSubmit={createPost} className="grid gap-3">
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
        </div>
      )}

      {items === null && <p className="text-slate-400 text-sm">{t("Ачааллаж байна…", "Loading…", "読み込み中…", "加载中…")}</p>}
      {items && items.length === 0 && <p className="text-slate-400 text-sm">{t("Мэдээ алга.", "No posts yet.", "投稿がありません。", "暂无文章。")}</p>}

      <div className="grid gap-4">
        {items?.map((item) => (
          <div key={item.id} className="rounded-xl border border-slate-200 p-5 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${item.status === "published" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                  {item.status === "published" ? t("Нийтэлсэн", "Published", "公開済み", "已发布") : t("Ноорог", "Draft", "下書き", "草稿")}
                </span>
                {item.facebook_url && (
                  <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Facebook</span>
                )}
              </div>
              {item.facebook_url ? (
                <a href={item.facebook_url} target="_blank" rel="noopener noreferrer" className="font-bold text-rotary-royal-blue hover:underline break-all">
                  {item.facebook_url}
                </a>
              ) : (
                <>
                  <p className="font-bold text-slate-900">{item.title_en}</p>
                  <p className="text-sm text-slate-500 line-clamp-2">{item.body_en}</p>
                </>
              )}
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
