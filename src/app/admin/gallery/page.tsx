"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/language-context";

// Which photos show in the home page gallery strip is now an admin
// choice, not just "whatever was uploaded most recently" — this page
// lists every photo from both photo tables (general club library +
// project photos) and lets an admin flip a switch per photo. The home
// page (src/app/page.tsx) only queries rows where featured_home = true.
//
// A second "Folders" view sits alongside the photo grid — a flat list
// of every distinct folder in use (derived from storage_path, since
// Storage doesn't track folders as real objects), with rename and
// merge tools. Both operations physically move the files in the
// rciu-photos bucket (storage.move) and then repoint each affected
// row's storage_path — needed because the public URL is built from
// that column.
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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [view, setView] = useState<"photos" | "folders">("photos");
  const [folderFilter, setFolderFilter] = useState<string | null>(null);
  const [busyFolder, setBusyFolder] = useState<string | null>(null);
  const [renamingFolder, setRenamingFolder] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [mergeFrom, setMergeFrom] = useState("");
  const [mergeTo, setMergeTo] = useState("");

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

  async function deletePhoto(row: PhotoRow) {
    if (!confirm(t("Энэ зургийг устгах уу? Буцаах боломжгүй.", "Delete this photo? This can't be undone.", "この写真を削除しますか?元に戻せません。", "确定删除这张照片吗?此操作无法撤销。"))) return;
    setDeletingId(row.id);
    setError(null);
    // Remove the file from Storage first, then the DB row — if the
    // storage delete fails (e.g. already gone) we still clean up the
    // now-orphaned row rather than leaving a broken entry behind.
    const { error: storageError } = await supabase.storage.from("rciu-photos").remove([row.storage_path]);
    if (storageError && !/not.?found/i.test(storageError.message)) {
      setError(storageError.message);
      setDeletingId(null);
      return;
    }
    const table = row.source === "club" ? "club_photos" : "project_media";
    const { error: rowError } = await supabase.from(table).delete().eq("id", row.id);
    if (rowError) {
      setError(rowError.message);
      setDeletingId(null);
      return;
    }
    setItems((prev) => prev && prev.filter((p) => p.id !== row.id));
    setDeletingId(null);
  }

  // folder = everything in storage_path before the final "/" segment
  // (the filename). Grouped across both tables since they share one bucket.
  const folders = useMemo(() => {
    const map = new Map<string, PhotoRow[]>();
    for (const p of items ?? []) {
      const idx = p.storage_path.lastIndexOf("/");
      const folder = idx === -1 ? "(root)" : p.storage_path.slice(0, idx);
      if (!map.has(folder)) map.set(folder, []);
      map.get(folder)!.push(p);
    }
    return Array.from(map.entries())
      .map(([folder, photos]) => ({ folder, photos }))
      .sort((a, b) => a.folder.localeCompare(b.folder));
  }, [items]);

  // Shared by rename and merge — both are "move everything under
  // `fromFolder/` to `toFolder/`". Moves the actual file in Storage
  // first (so the public URL keeps working), then repoints the row.
  async function moveFolder(fromFolder: string, toFolder: string) {
    if (!toFolder.trim() || toFolder === fromFolder) return;
    setBusyFolder(fromFolder);
    setError(null);
    const affected = (items ?? []).filter((p) => p.storage_path.startsWith(`${fromFolder}/`));
    for (const row of affected) {
      const filename = row.storage_path.slice(fromFolder.length + 1);
      const newPath = `${toFolder}/${filename}`;
      const { error: moveError } = await supabase.storage.from("rciu-photos").move(row.storage_path, newPath);
      if (moveError) {
        setError(`${row.storage_path}: ${moveError.message}`);
        setBusyFolder(null);
        return;
      }
      const table = row.source === "club" ? "club_photos" : "project_media";
      const { error: updateError } = await supabase.from(table).update({ storage_path: newPath }).eq("id", row.id);
      if (updateError) {
        setError(`${row.storage_path}: ${updateError.message}`);
        setBusyFolder(null);
        return;
      }
    }
    setBusyFolder(null);
    setRenamingFolder(null);
    setMergeFrom("");
    setMergeTo("");
    refresh();
  }

  const featuredCount = items?.filter((p) => p.featured_home).length ?? 0;
  const visiblePhotos = folderFilter ? (items ?? []).filter((p) => p.storage_path.startsWith(`${folderFilter}/`)) : items;

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

      <div className="mb-6 grid grid-cols-2 rounded-lg border border-slate-200 p-1 text-sm font-semibold w-fit">
        <button
          type="button"
          onClick={() => setView("photos")}
          className={`rounded-md px-4 py-1.5 transition-colors ${view === "photos" ? "bg-rotary-royal-blue text-white" : "text-slate-600"}`}
        >
          {t("Зургууд", "Photos", "写真", "照片")}
        </button>
        <button
          type="button"
          onClick={() => setView("folders")}
          className={`rounded-md px-4 py-1.5 transition-colors ${view === "folders" ? "bg-rotary-royal-blue text-white" : "text-slate-600"}`}
        >
          {t("Хавтаснууд", "Folders", "フォルダ", "文件夹")}
        </button>
      </div>

      {error && <p className="text-red-600 text-sm mb-4 break-all">{error}</p>}

      {view === "photos" && (
        <>
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <p className="text-sm text-slate-400">
              {t(`Сонгогдсон: ${featuredCount}`, `Featured: ${featuredCount}`, `選択中: ${featuredCount}`, `已选择：${featuredCount}`)}
            </p>
            {folderFilter && (
              <button
                onClick={() => setFolderFilter(null)}
                className="text-xs font-semibold px-3 py-1 rounded-full bg-rotary-royal-blue/10 text-rotary-royal-blue"
              >
                {folderFilter} × {t("Шүүлтүүр цуцлах", "Clear filter", "フィルター解除", "清除筛选")}
              </button>
            )}
          </div>

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

          {visiblePhotos && visiblePhotos.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visiblePhotos.map((p) => {
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
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => toggle(p)}
                          disabled={savingId === p.id}
                          aria-pressed={p.featured_home}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${p.featured_home ? "bg-rotary-gold" : "bg-slate-300"} disabled:opacity-50`}
                          title={t("Нүүр хуудсанд харуулах", "Show on home page", "ホームページに表示", "在首页显示")}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${p.featured_home ? "translate-x-6" : "translate-x-1"}`} />
                        </button>
                        <button
                          onClick={() => deletePhoto(p)}
                          disabled={deletingId === p.id}
                          title={t("Устгах", "Delete", "削除", "删除")}
                          className="text-xs font-semibold px-2 py-1.5 rounded-md border border-rotary-cardinal text-rotary-cardinal hover:bg-rotary-cardinal hover:text-white disabled:opacity-50"
                        >
                          {deletingId === p.id ? "…" : t("Устгах", "Delete", "削除", "删除")}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {view === "folders" && (
        <div>
          <p className="text-sm text-slate-500 mb-6 max-w-2xl">
            {t(
              "Хавтасны нэрийг өөрчлөх эсвэл хоёр хавтасыг нэгтгэх боломжтой. Энэ нь доторх бүх зургийг физикээр шилжүүлнэ.",
              "Rename a folder, or merge one folder into another — both physically move every photo inside it.",
              "フォルダ名の変更、または2つのフォルダを統合できます — どちらも中の写真を物理的に移動します。",
              "可以重命名文件夹，或将一个文件夹合并到另一个——两者都会实际移动其中的所有照片。"
            )}
          </p>

          {folders.length > 0 && (
            <div className="rounded-xl border border-slate-200 p-5 mb-8">
              <h3 className="font-semibold text-slate-900 mb-3">{t("Хавтас нэгтгэх", "Merge Folders", "フォルダ統合", "合并文件夹")}</h3>
              <div className="flex flex-wrap items-center gap-3">
                <select value={mergeFrom} onChange={(e) => setMergeFrom(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
                  <option value="">{t("Эх хавтас", "From folder", "移動元", "源文件夹")}</option>
                  {folders.map((f) => (
                    <option key={f.folder} value={f.folder}>{f.folder} ({f.photos.length})</option>
                  ))}
                </select>
                <span className="text-slate-400 text-sm">→</span>
                <select value={mergeTo} onChange={(e) => setMergeTo(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
                  <option value="">{t("Хүлээн авах хавтас", "Into folder", "移動先", "目标文件夹")}</option>
                  {folders.filter((f) => f.folder !== mergeFrom).map((f) => (
                    <option key={f.folder} value={f.folder}>{f.folder} ({f.photos.length})</option>
                  ))}
                </select>
                <button
                  disabled={!mergeFrom || !mergeTo || busyFolder === mergeFrom}
                  onClick={() => moveFolder(mergeFrom, mergeTo)}
                  className="text-sm font-semibold bg-rotary-royal-blue text-white rounded-md px-4 py-2 disabled:opacity-50"
                >
                  {busyFolder === mergeFrom ? t("Нэгтгэж байна…", "Merging…", "統合中…", "合并中…") : t("Нэгтгэх", "Merge", "統合", "合并")}
                </button>
              </div>
            </div>
          )}

          {folders.length === 0 && (
            <p className="text-slate-400 text-sm">{t("Хавтас алга.", "No folders yet.", "フォルダがありません。", "暂无文件夹。")}</p>
          )}

          <div className="grid gap-2">
            {folders.map((f) => (
              <div key={f.folder} className="rounded-lg border border-slate-200 p-4 flex items-center justify-between gap-4 flex-wrap">
                {renamingFolder === f.folder ? (
                  <div className="flex items-center gap-2 flex-1 min-w-[16rem]">
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      className="rounded-md border border-slate-300 px-3 py-1.5 text-sm flex-1"
                    />
                    <button
                      disabled={busyFolder === f.folder}
                      onClick={() => moveFolder(f.folder, renameValue.trim())}
                      className="text-xs font-semibold px-3 py-1.5 rounded-md bg-rotary-royal-blue text-white disabled:opacity-50"
                    >
                      {busyFolder === f.folder ? t("Хадгалж байна…", "Saving…", "保存中…", "保存中…") : t("Хадгалах", "Save", "保存", "保存")}
                    </button>
                    <button onClick={() => setRenamingFolder(null)} className="text-xs font-semibold px-3 py-1.5 rounded-md border border-slate-300 text-slate-600">
                      {t("Цуцлах", "Cancel", "キャンセル", "取消")}
                    </button>
                  </div>
                ) : (
                  <>
                    <div>
                      <p className="font-mono text-sm text-slate-900">{f.folder}</p>
                      <p className="text-xs text-slate-400">
                        {t(`${f.photos.length} зураг`, `${f.photos.length} photo${f.photos.length === 1 ? "" : "s"}`, `${f.photos.length}枚`, `${f.photos.length} 张`)}
                        {" · "}
                        {f.photos.filter((p) => p.featured_home).length} {t("нүүрт", "featured", "ホーム掲載", "首页显示")}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => {
                          setView("photos");
                          setFolderFilter(f.folder);
                        }}
                        className="text-xs font-semibold px-3 py-1.5 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50"
                      >
                        {t("Зургууд харах", "View photos", "写真を見る", "查看照片")}
                      </button>
                      <button
                        onClick={() => {
                          setRenamingFolder(f.folder);
                          setRenameValue(f.folder);
                        }}
                        className="text-xs font-semibold px-3 py-1.5 rounded-md border border-rotary-royal-blue text-rotary-royal-blue hover:bg-rotary-royal-blue hover:text-white"
                      >
                        {t("Нэр өөрчлөх", "Rename", "名前変更", "重命名")}
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
