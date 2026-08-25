"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/language-context";

// Which photos show in the home page gallery strip is now an admin
// choice, not just "whatever was uploaded most recently" — this page
// lists every photo from both photo tables (general club library +
// project photos) and lets an admin flip a switch per photo. The home
// page (src/app/page.tsx) only queries rows where featured_home = true.
type PhotoRow = {
  id: string;
  source: "club" | "project";
  storage_path: string;
  caption: string | null;
  featured_home: boolean;
  created_at: string;
};

export default function AdminGalleryPage() {
  const { t } = useLanguage();
  const [items, setItems] = useState<PhotoRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function refresh() {
    const [clubRes, projectRes] = await Promise.all([
      supabase.from("club_photos").select("id,storage_path,caption,featured_home,created_at").order("created_at", { ascending: false }),
      supabase.from("project_media").select("id,storage_path,caption,featured_home,created_at").order("created_at", { ascending: false }),
    ]);
    if (clubRes.error) setError(clubRes.error.message);
    if (projectRes.error) setError(projectRes.error.message);
    const club = ((clubRes.data as Omit<PhotoRow, "source">[]) ?? []).map((p) => ({ ...p, source: "club" as const }));
    const project = ((projectRes.data as Omit<PhotoRow, "source">[]) ?? []).map((p) => ({ ...p, source: "project" as const }));
    setItems([...club, ...project].sort((a, b) => (a.created_at < b.created_at ? 1 : -1)));
  }

  useEffect(() => {
    refresh();
  }, []);

  async function toggle(row: PhotoRow) {
    setSavingId(row.id);
    setError(null);
    const table = row.source === "club" ? "club_photos" : "project_media";
    const { error } = await supabase.from(table).update({ featured_home: !row.featured_home }).eq("id", row.id);
    if (error) setError(error.message);
    else setItems((prev) => prev && prev.map((p) => (p.id === row.id ? { ...p, featured_home: !p.featured_home } : p)));
    setSavingId(null);
  }

  const featuredCount = items?.filter((p) => p.featured_home).length ?? 0;

  return (
    <div className="container-page py-10">
      <h1 className="text-2xl font-bold text-rotary-royal-blue mb-2">
        {t("Зургийн цомог", "Home Page Gallery", "フォトギャラリー", "首页照片集")}
      </h1>
      <p className="text-slate-500 mb-6 max-w-2xl">
        {t(
          "Энд сонгосон зургууд л нүүр хуудасны зургийн цомогт харагдана. Бусад зургууд системд хадгалагдсан хэвээр байна.",
          "Only photos switched on here appear in the home page gallery strip. Everything else stays uploaded but hidden from the home page.",
          "ここでオンにした写真だけがホームページのギャラリーに表示されます。他の写真はアップロードされたまま非表示になります。",
          "只有在此处开启的照片才会显示在首页照片集中。其他照片仍会保存，但不会显示在首页。"
        )}
      </p>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      <p className="text-sm text-slate-400 mb-4">
        {t(`Сонгогдсон: ${featuredCount}`, `Featured: ${featuredCount}`, `選択中: ${featuredCount}`, `已选择：${featuredCount}`)}
      </p>

      {items === null && <p className="text-slate-400 text-sm">{t("Ачааллаж байна…", "Loading…", "読み込み中…", "加载中…")}</p>}

      {items && items.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
          {t(
            "Гишүүд дашбоардаас зураг байршуулмагц энд харагдана.",
            "Photos will show up here once members upload them from their dashboard.",
            "会員がダッシュボードから写真をアップロードすると、ここに表示されます。",
            "会员从个人主页上传照片后，将显示在此处。"
          )}
        </div>
      )}

      {items && items.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => {
            const url = supabase.storage.from("rciu-photos").getPublicUrl(p.storage_path).data.publicUrl;
            return (
              <div key={p.id} className={`rounded-xl border overflow-hidden bg-white ${p.featured_home ? "border-rotary-gold ring-2 ring-rotary-gold/40" : "border-slate-200"}`}>
                <div className="relative w-full aspect-video bg-slate-100">
                  <Image src={url} alt={p.caption ?? ""} fill className="object-cover" />
                  <span className="absolute top-2 left-2 text-[10px] font-semibold uppercase tracking-wide bg-white/90 px-2 py-0.5 rounded-full text-slate-600">
                    {p.source === "club" ? t("Ерөнхий", "Club photo", "一般", "俱乐部照片") : t("Төслийн", "Project photo", "プロジェクト", "项目照片")}
                  </span>
                </div>
                <div className="p-3 flex items-center justify-between gap-3">
                  <span className="text-xs text-slate-500 line-clamp-1">{p.caption || t("Тайлбаргүй", "No caption", "説明なし", "无说明")}</span>
                  <button
                    onClick={() => toggle(p)}
                    disabled={savingId === p.id}
                    aria-pressed={p.featured_home}
                    className={`shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition ${p.featured_home ? "bg-rotary-gold" : "bg-slate-300"} disabled:opacity-50`}
                    title={t("Нүүр хуудсанд харуулах", "Show on home page", "ホームページに表示", "在首页显示")}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${p.featured_home ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
