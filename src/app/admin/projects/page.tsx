"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { asset } from "@/lib/asset";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/language-context";

type CauseIcon = "basic_education_literacy" | "maternal_child_health" | "disease_prevention" | "other";
type ProjectType = "local_project" | "district_grant" | "global_grant";

type ProjectRow = {
  id: string;
  title_mn: string;
  title_en: string;
  description_mn: string | null;
  description_en: string | null;
  cover_image_url: string | null;
  cause_icon: CauseIcon | null;
  status: "ongoing" | "completed" | "planned";
  project_type: ProjectType;
  funding_amount: number | null;
  funding_currency: string;
  grant_number: string | null;
};

const PROJECT_TYPE_LABEL: Record<ProjectType, { mn: string; en: string; ja: string; zh: string }> = {
  local_project: { mn: "Орон нутгийн төсөл", en: "Local Project", ja: "地域プロジェクト", zh: "本地項目" },
  district_grant: { mn: "Дүүргийн тэтгэлэг (DG)", en: "District Grant (DG)", ja: "地区補助金(DG)", zh: "地區獎助金(DG)" },
  global_grant: { mn: "Глобал тэтгэлэг (GG)", en: "Global Grant (GG)", ja: "グローバル補助金(GG)", zh: "全球獎助金(GG)" },
};

// Local Project has no outside grant at all; District Grant and Global
// Grant are both Rotary Foundation grant programs and both get an
// official grant number assigned — so the "Grant number" field only
// makes sense (and only shows) for those two.
const HAS_GRANT_NUMBER: Record<ProjectType, boolean> = {
  local_project: false,
  district_grant: true,
  global_grant: true,
};

const CAUSES: { value: CauseIcon; icon: string | null; label_mn: string; label_en: string }[] = [
  { value: "basic_education_literacy", icon: "/causes/basic-education-literacy.png", label_mn: "Боловсрол, бичиг үсэг", label_en: "Basic Education & Literacy" },
  { value: "maternal_child_health", icon: "/causes/maternal-child-health.png", label_mn: "Эх, хүүхдийн эрүүл мэнд", label_en: "Maternal & Child Health" },
  { value: "disease_prevention", icon: "/causes/disease-prevention-treatment.png", label_mn: "Өвчнөөс сэргийлэх, эмчлэх", label_en: "Disease Prevention & Treatment" },
  { value: "other", icon: null, label_mn: "Бусад", label_en: "Other" },
];

const EMPTY = {
  title_mn: "",
  title_en: "",
  description_mn: "",
  description_en: "",
  cause_icon: "other" as CauseIcon,
  status: "ongoing" as ProjectRow["status"],
  project_type: "local_project" as ProjectType,
  funding_amount: "",
  funding_currency: "USD",
  grant_number: "",
};

const MAX_PHOTOS = 3;

export default function AdminProjectsPage() {
  const { t } = useLanguage();
  const [items, setItems] = useState<ProjectRow[] | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [existingCoverUrl, setExistingCoverUrl] = useState<string | null>(null);

  async function refresh() {
    const { data, error } = await supabase.from("projects").select("*").order("created_at", { ascending: false });
    if (error) setError(error.message);
    else setItems(data as ProjectRow[]);
  }

  useEffect(() => {
    refresh();
  }, []);

  function handlePhotoPick(fileList: FileList | null) {
    if (!fileList) return;
    const picked = Array.from(fileList).slice(0, MAX_PHOTOS);
    if (fileList.length > MAX_PHOTOS) {
      setError(
        t(
          `Хамгийн ихдээ ${MAX_PHOTOS} зураг сонгоно уу — эхний ${MAX_PHOTOS}-г авлаа.`,
          `Up to ${MAX_PHOTOS} photos — kept the first ${MAX_PHOTOS}.`,
          `最大${MAX_PHOTOS}枚まで — 最初の${MAX_PHOTOS}枚を使用します。`,
          `最多${MAX_PHOTOS}張照片 — 已保留前${MAX_PHOTOS}張。`
        )
      );
    } else {
      setError(null);
    }
    setPhotoFiles(picked);
  }

  // Uploads each selected photo into this project's own storage folder
  // and records it in project_media — the same table the public
  // gallery and the members' own dashboard uploads already use, so
  // these photos automatically show up there too, not just on the
  // project card's auto-collage.
  async function uploadProjectPhotos(projectId: string): Promise<{ urls: string[]; error: string | null }> {
    if (photoFiles.length === 0) return { urls: [], error: null };
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const year = new Date().getFullYear();
    const urls: string[] = [];
    for (const file of photoFiles) {
      const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
      const path = `${year}/projects/${projectId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;
      const { error: uploadError } = await supabase.storage.from("rciu-photos").upload(path, file);
      if (uploadError) return { urls, error: uploadError.message };
      const { error: mediaError } = await supabase.from("project_media").insert({
        project_id: projectId,
        uploaded_by: session?.user.id ?? null,
        storage_path: path,
      });
      if (mediaError) return { urls, error: mediaError.message };
      urls.push(supabase.storage.from("rciu-photos").getPublicUrl(path).data.publicUrl);
    }
    return { urls, error: null };
  }

  function startEdit(item: ProjectRow) {
    setEditingId(item.id);
    setForm({
      title_mn: item.title_mn,
      title_en: item.title_en,
      description_mn: item.description_mn ?? "",
      description_en: item.description_en ?? "",
      cause_icon: item.cause_icon ?? "other",
      status: item.status,
      project_type: item.project_type,
      funding_amount: item.funding_amount != null ? String(item.funding_amount) : "",
      funding_currency: item.funding_currency,
      grant_number: item.grant_number ?? "",
    });
    setExistingCoverUrl(item.cover_image_url);
    setPhotoFiles([]);
    setError(null);
    setShowForm(true);
  }

  function cancelForm() {
    setEditingId(null);
    setForm(EMPTY);
    setPhotoFiles([]);
    setExistingCoverUrl(null);
    setError(null);
    setShowForm(false);
  }

  async function saveProject(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const payload = {
      title_mn: form.title_mn,
      title_en: form.title_en,
      description_mn: form.description_mn || null,
      description_en: form.description_en || null,
      cause_icon: form.cause_icon,
      status: form.status,
      project_type: form.project_type,
      funding_amount: form.funding_amount ? Number(form.funding_amount) : null,
      funding_currency: form.funding_currency || "USD",
      grant_number: HAS_GRANT_NUMBER[form.project_type] ? form.grant_number || null : null,
    };

    let projectId = editingId;
    if (editingId) {
      const { error: updateError } = await supabase.from("projects").update(payload).eq("id", editingId);
      if (updateError) {
        setBusy(false);
        setError(updateError.message);
        return;
      }
    } else {
      const { data: inserted, error: insertError } = await supabase.from("projects").insert(payload).select().single();
      if (insertError || !inserted) {
        setBusy(false);
        setError(insertError?.message ?? "Insert failed");
        return;
      }
      projectId = inserted.id;
    }

    // Photos are uploaded once the project row exists (project_media
    // needs a real project_id to attach to). New photos are ADDED to
    // whatever's already there when editing — they don't replace the
    // existing ones. The first photo only becomes cover_image_url if
    // the project didn't already have one, so re-editing an existing
    // project's text never silently swaps out its cover photo.
    const { urls, error: photoError } = await uploadProjectPhotos(projectId!);
    if (photoError) {
      setBusy(false);
      setError(photoError);
      // The project itself saved fine even though a photo failed —
      // don't lose that progress, just leave the form open so the
      // admin can see what happened and retry the photos separately
      // from the project's row below.
      cancelForm();
      refresh();
      return;
    }
    if (urls.length > 0 && !existingCoverUrl) {
      await supabase.from("projects").update({ cover_image_url: urls[0] }).eq("id", projectId!);
    }

    setBusy(false);
    cancelForm();
    refresh();
  }

  async function remove(item: ProjectRow) {
    if (!confirm(t("Устгах уу?", "Delete this project?", "削除しますか?", "確定刪除嗎?"))) return;
    await supabase.from("projects").delete().eq("id", item.id);
    refresh();
  }

  async function setStatus(item: ProjectRow, status: ProjectRow["status"]) {
    await supabase.from("projects").update({ status }).eq("id", item.id);
    refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-900">{t("Төсөл удирдах", "Manage Projects", "プロジェクト管理", "項目管理")}</h2>
        <button onClick={() => (showForm ? cancelForm() : setShowForm(true))} className="text-sm font-semibold bg-rotary-azure text-white rounded-md px-4 py-2">
          {showForm ? t("Хаах", "Cancel", "キャンセル", "取消") : t("+ Шинэ төсөл", "+ New Project", "+ 新規プロジェクト", "+ 新建項目")}
        </button>
      </div>

      {showForm && (
        <form onSubmit={saveProject} className="rounded-xl border border-slate-200 p-6 mb-8 grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <input required placeholder={t("Гарчиг (MN)", "Title (MN)", "タイトル(MN)", "標題(MN)")} value={form.title_mn} onChange={(e) => setForm({ ...form, title_mn: e.target.value })} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
            <input required placeholder={t("Гарчиг (EN)", "Title (EN)", "タイトル(EN)", "標題(EN)")} value={form.title_en} onChange={(e) => setForm({ ...form, title_en: e.target.value })} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <textarea placeholder={t("Тайлбар (MN)", "Description (MN)", "説明(MN)", "描述(MN)")} value={form.description_mn} onChange={(e) => setForm({ ...form, description_mn: e.target.value })} rows={3} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <textarea placeholder={t("Тайлбар (EN)", "Description (EN)", "説明(EN)", "描述(EN)")} value={form.description_en} onChange={(e) => setForm({ ...form, description_en: e.target.value })} rows={3} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-1">
              {t(`Зураг (заавал биш, хамгийн ихдээ ${MAX_PHOTOS})`, `Photos (optional, up to ${MAX_PHOTOS})`, `写真(任意、最大${MAX_PHOTOS}枚)`, `照片(可選，最多${MAX_PHOTOS}張)`)}
            </p>
            <p className="text-xs text-slate-400 mb-2">
              {t(
                "1-ээс 3 зураг сонговол хамгийн эхнийх нь нүүр хуудасны төсөл дээр, бүгд хамтдаа коллаж болж харагдана.",
                "Pick 1-3 photos — they're combined into an automatic collage on the project card, and the first one is used as the cover photo elsewhere on the site.",
                "1〜3枚の写真を選択すると、プロジェクトカードに自動コラージュとして表示されます。最初の1枚はサイト内の他の場所でカバー写真として使われます。",
                "選擇1-3張照片，將自動拼成項目卡片上的拼貼圖，第一張會作為封面照片顯示在網站其他位置。"
              )}
            </p>
            {existingCoverUrl && (
              <div className="mb-2">
                <p className="text-xs text-slate-400 mb-1">{t("Одоогийн зураг", "Current photo", "現在の写真", "目前的照片")}</p>
                <Image src={existingCoverUrl} alt="" width={100} height={75} className="rounded-md object-cover w-24 h-[4.5rem] border border-slate-200" />
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handlePhotoPick(e.target.files)}
              className="text-sm"
            />
            {photoFiles.length > 0 && (
              <p className="text-xs text-slate-500 mt-1">
                {photoFiles.map((f) => f.name).join(", ")}
              </p>
            )}
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-700 mb-2">{t("Чиглэл сонгох", "Pick a focus area", "分野を選択", "選擇關注領域")}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {CAUSES.map((c) => (
                <button
                  type="button"
                  key={c.value}
                  onClick={() => setForm({ ...form, cause_icon: c.value })}
                  className={`rounded-lg border-2 p-3 flex flex-col items-center gap-2 text-center ${form.cause_icon === c.value ? "border-rotary-azure bg-blue-50" : "border-slate-200"}`}
                >
                  {c.icon ? (
                    <Image src={asset(c.icon)} alt="" width={40} height={40} />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-200" />
                  )}
                  <span className="text-xs font-medium text-slate-600">{t(c.label_mn, c.label_en)}</span>
                </button>
              ))}
            </div>
          </div>

          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ProjectRow["status"] })} className="rounded-md border border-slate-300 px-3 py-2 text-sm w-fit">
            <option value="planned">{t("Төлөвлөж буй", "Planned", "計画中", "計劃中")}</option>
            <option value="ongoing">{t("Хэрэгжиж буй", "Ongoing", "実施中", "進行中")}</option>
            <option value="completed">{t("Дууссан", "Completed", "完了", "已完成")}</option>
          </select>

          <div>
            <p className="text-sm font-semibold text-slate-700 mb-2">{t("Санхүүжилтийн төрөл", "Funding type", "資金の種類", "資助類型")}</p>
            <div className="grid grid-cols-3 gap-3">
              {(Object.keys(PROJECT_TYPE_LABEL) as ProjectType[]).map((pt) => (
                <button
                  type="button"
                  key={pt}
                  onClick={() => setForm({ ...form, project_type: pt })}
                  className={`rounded-lg border-2 px-3 py-2 text-xs font-semibold text-center ${form.project_type === pt ? "border-rotary-azure bg-blue-50 text-rotary-azure" : "border-slate-200 text-slate-600"}`}
                >
                  {t(PROJECT_TYPE_LABEL[pt].mn, PROJECT_TYPE_LABEL[pt].en, PROJECT_TYPE_LABEL[pt].ja, PROJECT_TYPE_LABEL[pt].zh)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-700 mb-2">{t("Санхүүжилт (заавал биш)", "Funding (optional)", "資金(任意)", "資助(可選)")}</p>
            <div className={`grid gap-3 ${HAS_GRANT_NUMBER[form.project_type] ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
              <input type="number" min="0" step="0.01" placeholder={t("Дүн", "Amount", "金額", "金額")} value={form.funding_amount} onChange={(e) => setForm({ ...form, funding_amount: e.target.value })} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
              <input placeholder={t("Валют (жишээ: USD)", "Currency (e.g. USD)", "通貨(例:USD)", "貨幣(例:USD)")} value={form.funding_currency} onChange={(e) => setForm({ ...form, funding_currency: e.target.value })} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
              {HAS_GRANT_NUMBER[form.project_type] && (
                <input
                  placeholder={
                    form.project_type === "global_grant"
                      ? t("GG дугаар (заавал биш)", "GG number (optional)", "GG番号(任意)", "GG編號(可選)")
                      : t("DG дугаар (заавал биш)", "DG number (optional)", "DG番号(任意)", "DG編號(可選)")
                  }
                  value={form.grant_number}
                  onChange={(e) => setForm({ ...form, grant_number: e.target.value })}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              )}
            </div>
          </div>

          {error && <p className="text-sm text-rotary-cardinal">{error}</p>}
          <button type="submit" disabled={busy} className="justify-self-start bg-rotary-azure text-white font-semibold rounded-md px-5 py-2 text-sm disabled:opacity-60">
            {busy
              ? t("Хадгалж байна…", "Saving…", "保存中…", "保存中…")
              : editingId
                ? t("Шинэчлэх", "Update Project", "更新", "更新")
                : t("Хадгалах", "Save Project", "保存", "保存")}
          </button>
        </form>
      )}

      {items === null && <p className="text-slate-400 text-sm">{t("Ачааллаж байна…", "Loading…", "読み込み中…", "加載中…")}</p>}
      {items && items.length === 0 && <p className="text-slate-400 text-sm">{t("Төсөл алга.", "No projects yet.", "プロジェクトがありません。", "暫無項目。")}</p>}

      <div className="grid gap-4">
        {items?.map((item) => {
          const cause = CAUSES.find((c) => c.value === item.cause_icon);
          return (
            <div key={item.id} className="rounded-xl border border-slate-200 p-5 flex items-start justify-between gap-4">
              <div className="flex gap-3">
                {cause?.icon && <Image src={asset(cause.icon)} alt="" width={32} height={32} className="shrink-0" />}
                <div>
                  <p className="font-bold text-slate-900">
                    {item.title_en}
                    {item.project_type !== "local_project" && (
                      <span className="ml-2 text-[10px] font-bold text-rotary-azure align-middle">
                        {item.project_type === "global_grant" ? "GG" : "DG"}
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-slate-500 line-clamp-2">{item.description_en}</p>
                  {item.funding_amount != null && (
                    <p className="text-xs text-rotary-azure font-semibold mt-1">
                      {item.funding_currency} {item.funding_amount.toLocaleString()}
                      {item.grant_number && ` · ${item.grant_number}`}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-2 items-end shrink-0">
                <select
                  value={item.status}
                  onChange={(e) => setStatus(item, e.target.value as ProjectRow["status"])}
                  className="text-xs rounded-md border border-slate-300 px-2 py-1"
                >
                  <option value="planned">{t("Төлөвлөж буй", "Planned", "計画中", "計劃中")}</option>
                  <option value="ongoing">{t("Хэрэгжиж буй", "Ongoing", "実施中", "進行中")}</option>
                  <option value="completed">{t("Дууссан", "Completed", "完了", "已完成")}</option>
                </select>
                <div className="flex gap-2">
                  <button onClick={() => startEdit(item)} className="text-xs font-semibold px-3 py-1.5 rounded-md border border-rotary-azure text-rotary-azure hover:bg-rotary-azure hover:text-white">
                    {t("Засах", "Edit", "編集", "編輯")}
                  </button>
                  <button onClick={() => remove(item)} className="text-xs font-semibold px-3 py-1.5 rounded-md border border-rotary-cardinal text-rotary-cardinal hover:bg-rotary-cardinal hover:text-white">
                    {t("Устгах", "Delete", "削除", "刪除")}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
