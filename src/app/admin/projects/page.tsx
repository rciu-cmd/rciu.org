"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { asset } from "@/lib/asset";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/language-context";

type CauseIcon = "basic_education_literacy" | "maternal_child_health" | "disease_prevention" | "other";

type ProjectRow = {
  id: string;
  title_mn: string;
  title_en: string;
  description_mn: string | null;
  description_en: string | null;
  cover_image_url: string | null;
  cause_icon: CauseIcon | null;
  status: "ongoing" | "completed" | "planned";
  funding_amount: number | null;
  funding_currency: string;
  grant_number: string | null;
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
  cover_image_url: "",
  cause_icon: "other" as CauseIcon,
  status: "ongoing" as ProjectRow["status"],
  funding_amount: "",
  funding_currency: "USD",
  grant_number: "",
};

export default function AdminProjectsPage() {
  const { t } = useLanguage();
  const [items, setItems] = useState<ProjectRow[] | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function refresh() {
    const { data, error } = await supabase.from("projects").select("*").order("created_at", { ascending: false });
    if (error) setError(error.message);
    else setItems(data as ProjectRow[]);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.from("projects").insert({
      title_mn: form.title_mn,
      title_en: form.title_en,
      description_mn: form.description_mn || null,
      description_en: form.description_en || null,
      cover_image_url: form.cover_image_url || null,
      cause_icon: form.cause_icon,
      status: form.status,
      funding_amount: form.funding_amount ? Number(form.funding_amount) : null,
      funding_currency: form.funding_currency || "USD",
      grant_number: form.grant_number || null,
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

  async function remove(item: ProjectRow) {
    if (!confirm(t("Устгах уу?", "Delete this project?", "削除しますか?", "确定删除吗?"))) return;
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
        <h2 className="text-xl font-bold text-slate-900">{t("Төсөл удирдах", "Manage Projects", "プロジェクト管理", "项目管理")}</h2>
        <button onClick={() => setShowForm((v) => !v)} className="text-sm font-semibold bg-rotary-azure text-white rounded-md px-4 py-2">
          {showForm ? t("Хаах", "Cancel", "キャンセル", "取消") : t("+ Шинэ төсөл", "+ New Project", "+ 新規プロジェクト", "+ 新建项目")}
        </button>
      </div>

      {showForm && (
        <form onSubmit={createProject} className="rounded-xl border border-slate-200 p-6 mb-8 grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <input required placeholder={t("Гарчиг (MN)", "Title (MN)", "タイトル(MN)", "标题(MN)")} value={form.title_mn} onChange={(e) => setForm({ ...form, title_mn: e.target.value })} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
            <input required placeholder={t("Гарчиг (EN)", "Title (EN)", "タイトル(EN)", "标题(EN)")} value={form.title_en} onChange={(e) => setForm({ ...form, title_en: e.target.value })} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <textarea placeholder={t("Тайлбар (MN)", "Description (MN)", "説明(MN)", "描述(MN)")} value={form.description_mn} onChange={(e) => setForm({ ...form, description_mn: e.target.value })} rows={3} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <textarea placeholder={t("Тайлбар (EN)", "Description (EN)", "説明(EN)", "描述(EN)")} value={form.description_en} onChange={(e) => setForm({ ...form, description_en: e.target.value })} rows={3} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input placeholder={t("Зургийн URL (заавал биш)", "Cover photo URL (optional)", "写真URL(任意)", "封面照片URL(可选)")} value={form.cover_image_url} onChange={(e) => setForm({ ...form, cover_image_url: e.target.value })} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />

          <div>
            <p className="text-sm font-semibold text-slate-700 mb-2">{t("Чиглэл сонгох", "Pick a focus area", "分野を選択", "选择关注领域")}</p>
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
            <option value="planned">{t("Төлөвлөж буй", "Planned", "計画中", "计划中")}</option>
            <option value="ongoing">{t("Хэрэгжиж буй", "Ongoing", "実施中", "进行中")}</option>
            <option value="completed">{t("Дууссан", "Completed", "完了", "已完成")}</option>
          </select>

          <div>
            <p className="text-sm font-semibold text-slate-700 mb-2">{t("Санхүүжилт (заавал биш)", "Funding (optional)", "資金(任意)", "资助(可选)")}</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <input type="number" min="0" step="0.01" placeholder={t("Дүн", "Amount", "金額", "金额")} value={form.funding_amount} onChange={(e) => setForm({ ...form, funding_amount: e.target.value })} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
              <input placeholder={t("Валют (жишээ: USD)", "Currency (e.g. USD)", "通貨(例:USD)", "货币(例:USD)")} value={form.funding_currency} onChange={(e) => setForm({ ...form, funding_currency: e.target.value })} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
              <input placeholder={t("Global Grant дугаар (заавал биш)", "Grant number (optional)", "グラント番号(任意)", "资助编号(可选)")} value={form.grant_number} onChange={(e) => setForm({ ...form, grant_number: e.target.value })} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>
          </div>

          {error && <p className="text-sm text-rotary-cardinal">{error}</p>}
          <button type="submit" disabled={busy} className="justify-self-start bg-rotary-azure text-white font-semibold rounded-md px-5 py-2 text-sm disabled:opacity-60">
            {busy ? t("Хадгалж байна…", "Saving…", "保存中…", "保存中…") : t("Хадгалах", "Save Project", "保存", "保存")}
          </button>
        </form>
      )}

      {items === null && <p className="text-slate-400 text-sm">{t("Ачааллаж байна…", "Loading…", "読み込み中…", "加载中…")}</p>}
      {items && items.length === 0 && <p className="text-slate-400 text-sm">{t("Төсөл алга.", "No projects yet.", "プロジェクトがありません。", "暂无项目。")}</p>}

      <div className="grid gap-4">
        {items?.map((item) => {
          const cause = CAUSES.find((c) => c.value === item.cause_icon);
          return (
            <div key={item.id} className="rounded-xl border border-slate-200 p-5 flex items-start justify-between gap-4">
              <div className="flex gap-3">
                {cause?.icon && <Image src={asset(cause.icon)} alt="" width={32} height={32} className="shrink-0" />}
                <div>
                  <p className="font-bold text-slate-900">{item.title_en}</p>
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
                  <option value="planned">{t("Төлөвлөж буй", "Planned", "計画中", "计划中")}</option>
                  <option value="ongoing">{t("Хэрэгжиж буй", "Ongoing", "実施中", "进行中")}</option>
                  <option value="completed">{t("Дууссан", "Completed", "完了", "已完成")}</option>
                </select>
                <button onClick={() => remove(item)} className="text-xs font-semibold px-3 py-1.5 rounded-md border border-rotary-cardinal text-rotary-cardinal hover:bg-rotary-cardinal hover:text-white">
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
