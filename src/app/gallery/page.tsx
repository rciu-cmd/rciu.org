"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/language-context";

// Members-only photo library — browse everything anyone has uploaded,
// organized the same way the upload form organizes it: year > category
// > optional subfolder (club_photos), or year > Projects > project >
// optional subfolder (project_media). This is the member-facing
// counterpart to /admin/gallery — no featured/rename/merge/delete
// controls here, just browsing.
type PhotoRow = {
  id: string;
  source: "club" | "project";
  storage_path: string;
  caption: string | null;
  created_at: string;
  // Only set for source: "project" — the photo's real link to its
  // project, straight from the project_media row. Used instead of
  // parsing the storage_path so that renaming a folder in Admin →
  // Gallery → Folders (which rewrites the path text) can never break
  // the "which project is this" label — the path is just where the
  // file happens to live, not the source of truth for that.
  projectId: string | null;
};

type ClubCategory = "installation_ceremony" | "district_events" | "other";

const CATEGORY_LABELS: Record<ClubCategory, { mn: string; en: string }> = {
  installation_ceremony: { mn: "Албан ёсны ёслол", en: "Installation Ceremony" },
  district_events: { mn: "Дүүргийн арга хэмжээ", en: "District Event" },
  other: { mn: "Бусад", en: "Other" },
};

type FolderGroup = {
  key: string; // full path prefix, used to filter photos
  label: string; // human-friendly label
  photos: PhotoRow[];
};

export default function GalleryPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [checkedAuth, setCheckedAuth] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [items, setItems] = useState<PhotoRow[] | null>(null);
  const [projectTitles, setProjectTitles] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [openFolder, setOpenFolder] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Login-gated, same pattern as /members — guests get redirected.
  // Also checks admin_level, since the full-quality download button
  // below is restricted to super admins only, not every member.
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.replace("/login/");
        return;
      }
      setCheckedAuth(true);
      const { data } = await supabase.from("members").select("admin_level").eq("id", session.user.id).single();
      setIsSuperAdmin((data?.admin_level as string | undefined) === "super");
    });
  }, [router]);

  // Downloads the original, full-quality file — the Storage bucket
  // never resizes or recompresses what members upload, so this is
  // already the highest quality available, no separate "HQ" copy to
  // fetch. Goes through fetch()+blob rather than a plain <a download>
  // because the Storage URL is cross-origin, where the download
  // attribute is silently ignored by browsers (they'd just open the
  // image in a new tab instead of saving it).
  async function downloadPhoto(p: PhotoRow) {
    setDownloadingId(p.id);
    try {
      const url = supabase.storage.from("rciu-photos").getPublicUrl(p.storage_path).data.publicUrl;
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const filename = p.storage_path.split("/").pop() || "photo.jpg";
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch {
      setError(t("Татаж авахад алдаа гарлаа.", "Couldn't download the photo.", "ダウンロードに失敗しました。", "下載失敗。"));
    }
    setDownloadingId(null);
  }

  useEffect(() => {
    if (!checkedAuth) return;
    Promise.all([
      supabase.from("club_photos").select("id,storage_path,caption,created_at").order("created_at", { ascending: false }),
      supabase.from("project_media").select("id,project_id,storage_path,caption,created_at").order("created_at", { ascending: false }),
      supabase.from("projects").select("id,title_mn,title_en"),
    ]).then(([clubRes, projectRes, projectsRes]) => {
      if (clubRes.error) setError(clubRes.error.message);
      if (projectRes.error) setError((prev) => prev ?? projectRes.error?.message ?? null);
      const club = ((clubRes.data as Omit<PhotoRow, "source" | "projectId">[]) ?? []).map((p) => ({ ...p, source: "club" as const, projectId: null }));
      const project = ((projectRes.data as (Omit<PhotoRow, "source" | "projectId"> & { project_id: string })[]) ?? []).map((p) => ({
        id: p.id,
        source: "project" as const,
        storage_path: p.storage_path,
        caption: p.caption,
        created_at: p.created_at,
        projectId: p.project_id,
      }));
      setItems([...club, ...project].sort((a, b) => (a.created_at < b.created_at ? 1 : -1)));

      const titleMap: Record<string, string> = {};
      for (const p of (projectsRes.data as { id: string; title_mn: string; title_en: string }[]) ?? []) {
        titleMap[p.id] = t(p.title_mn, p.title_en);
      }
      setProjectTitles(titleMap);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- t() is stable enough for this one-time fetch; re-running on every language toggle isn't needed
  }, [checkedAuth]);

  // Group photos into human-friendly folders from their storage_path,
  // e.g. "2026/installation_ceremony/gala" -> "2026 · Installation
  // Ceremony · gala", or "2026/projects/<id>/photos" -> "2026 ·
  // Projects · <project title> · photos".
  const folders = useMemo<FolderGroup[]>(() => {
    const map = new Map<string, FolderGroup>();
    for (const p of items ?? []) {
      const parts = p.storage_path.split("/");
      parts.pop(); // filename
      if (parts.length === 0) continue;
      const key = parts.join("/");
      if (!map.has(key)) {
        const [year, categoryOrProjects, third, ...restParts] = parts;
        let label: string;
        if (categoryOrProjects === "projects") {
          // Prefer the photo's real project_id (from the DB row) over
          // the folder path's third segment — the path is just where
          // the file lives and can be renamed by an admin; project_id
          // is the actual, unbreakable link to the project.
          const projectLookupKey = p.projectId ?? third;
          const projectTitle = projectLookupKey ? (projectTitles[projectLookupKey] ?? t("Тодорхойгүй төсөл", "Unknown project")) : "";
          const subfolder = restParts.join(" / ");
          label = [year, t("Төслүүд", "Projects"), projectTitle, subfolder].filter(Boolean).join(" · ");
        } else {
          const catLabel = categoryOrProjects in CATEGORY_LABELS
            ? t(CATEGORY_LABELS[categoryOrProjects as ClubCategory].mn, CATEGORY_LABELS[categoryOrProjects as ClubCategory].en)
            : categoryOrProjects;
          const subfolder = [third, ...restParts].filter(Boolean).join(" / ");
          label = [year, catLabel, subfolder].filter(Boolean).join(" · ");
        }
        map.set(key, { key, label, photos: [] });
      }
      map.get(key)!.photos.push(p);
    }
    return Array.from(map.values()).sort((a, b) => b.key.localeCompare(a.key));
  }, [items, projectTitles, t]);

  const openGroup = folders.find((f) => f.key === openFolder) ?? null;

  if (!checkedAuth) {
    return <div className="container-page py-20 text-center text-slate-400">{t("Ачааллаж байна…", "Loading…", "読み込み中…", "加載中…")}</div>;
  }

  return (
    <div className="container-page py-14">
      <h1 className="text-3xl font-bold text-rotary-royal-blue mb-3">
        {t("Зургийн сан", "Photo Library", "写真ライブラリ", "照片庫")}
      </h1>
      <p className="text-slate-600 max-w-2xl mb-10">
        {t(
          "Гишүүдийн байршуулсан бүх зураг, хавтасаар эрэмбэлэгдсэн.",
          "Every photo members have uploaded, organized by folder.",
          "会員がアップロードしたすべての写真をフォルダ別に整理しています。",
          "會員上傳的所有照片，按文件夾整理。"
        )}
      </p>

      {error && (
        <p className="text-sm text-rotary-cardinal mb-6">
          {t("Зураг ачаалахад алдаа гарлаа.", "Couldn't load photos.", "写真を読み込めませんでした。", "無法加載照片。")} ({error})
        </p>
      )}

      {items === null && !error && (
        <p className="text-slate-400 text-sm">{t("Ачааллаж байна…", "Loading…", "読み込み中…", "加載中…")}</p>
      )}

      {items && items.length === 0 && (
        <p className="text-slate-400 text-sm">
          {t("Одоогоор зураг алга.", "No photos uploaded yet.", "アップロードされた写真はまだありません。", "暫無上傳的照片。")}
        </p>
      )}

      {openGroup ? (
        <div>
          <button
            onClick={() => setOpenFolder(null)}
            className="text-sm font-semibold text-rotary-royal-blue hover:underline mb-4 inline-flex items-center gap-1"
          >
            ← {t("Хавтас руу буцах", "Back to folders", "フォルダに戻る", "返回文件夾")}
          </button>
          <h2 className="font-bold text-lg text-slate-900 mb-4">{openGroup.label}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {openGroup.photos.map((p) => {
              const url = supabase.storage.from("rciu-photos").getPublicUrl(p.storage_path).data.publicUrl;
              return (
                <div key={p.id} className="rounded-xl border border-slate-200 overflow-hidden bg-white hover:shadow-lg transition">
                  <a href={url} target="_blank" rel="noopener noreferrer" className="block">
                    <div className="relative w-full aspect-video bg-slate-100">
                      <Image src={url} alt={p.caption ?? ""} fill className="object-cover" />
                    </div>
                  </a>
                  <div className="flex items-center justify-between gap-2 p-2">
                    {p.caption ? (
                      <p className="text-xs text-slate-500 line-clamp-1">{p.caption}</p>
                    ) : (
                      <span />
                    )}
                    {isSuperAdmin && (
                      <button
                        onClick={() => downloadPhoto(p)}
                        disabled={downloadingId === p.id}
                        title={t("Эх чанараар татах", "Download original quality", "元の画質でダウンロード", "下載原始畫質")}
                        className="shrink-0 text-xs font-semibold px-2 py-1 rounded-md border border-rotary-royal-blue text-rotary-royal-blue hover:bg-rotary-royal-blue hover:text-white disabled:opacity-50"
                      >
                        {downloadingId === p.id ? "…" : `⭳ ${t("Татах", "Download", "ダウンロード", "下載")}`}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        folders.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {folders.map((f) => {
              const cover = f.photos[0];
              const coverUrl = cover ? supabase.storage.from("rciu-photos").getPublicUrl(cover.storage_path).data.publicUrl : null;
              return (
                <button
                  key={f.key}
                  onClick={() => setOpenFolder(f.key)}
                  className="rounded-xl border border-slate-200 overflow-hidden bg-white text-left hover:shadow-lg hover:-translate-y-0.5 transition"
                >
                  <div className="relative w-full aspect-video bg-slate-100">
                    {coverUrl && <Image src={coverUrl} alt="" fill className="object-cover" />}
                  </div>
                  <div className="p-3">
                    <p className="font-semibold text-slate-900 text-sm line-clamp-2">{f.label}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {t(`${f.photos.length} зураг`, `${f.photos.length} photo${f.photos.length === 1 ? "" : "s"}`, `${f.photos.length}枚`, `${f.photos.length} 张`)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
