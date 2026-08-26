"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/language-context";

type Category = "sister_club" | "friendship_club" | "district" | "other";

type LinkRow = {
  id: string;
  name: string;
  category: Category;
  url: string | null;
  logo_url: string | null;
  description_mn: string | null;
  description_en: string | null;
  sort_order: number;
};

const EMPTY = {
  name: "",
  category: "sister_club" as Category,
  url: "",
  logo_url: "",
  description_mn: "",
  description_en: "",
  sort_order: "0",
};

const CATEGORY_LABEL: Record<Category, { mn: string; en: string }> = {
  sister_club: { mn: "Хамтын клуб", en: "Sister Club" },
  friendship_club: { mn: "Нөхөрсөг клуб", en: "Friendship Club" },
  district: { mn: "Дүүрэг", en: "District" },
  other: { mn: "Бусад", en: "Other" },
};

export default function AdminPartnersPage() {
  const { t } = useLanguage();
  const [items, setItems] = useState<LinkRow[] | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const { data, error } = await supabase.from("links_partners").select("*").order("sort_order");
    if (error) setError(error.message);
    else setItems(data as LinkRow[]);
  }

  useEffect(() => {
    refresh();
  }, []);

  function startEdit(item: LinkRow) {
    setEditingId(item.id);
    setForm({
      name: item.name,
      category: item.category,
      url: item.url ?? "",
      logo_url: item.logo_url ?? "",
      description_mn: item.description_mn ?? "",
      description_en: item.description_en ?? "",
      sort_order: String(item.sort_order),
    });
    setLogoFile(null);
    setShowForm(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    let logoUrl = form.logo_url || null;
    if (logoFile) {
      const safeName = logoFile.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
      const path = `logos/partners/${Date.now()}-${safeName}`;
      const { error: uploadError } = await supabase.storage.from("rciu-photos").upload(path, logoFile);
      if (uploadError) {
        setBusy(false);
        setError(uploadError.message);
        return;
      }
      logoUrl = supabase.storage.from("rciu-photos").getPublicUrl(path).data.publicUrl;
    }

    const payload = {
      name: form.name,
      category: form.category,
      url: form.url || null,
      logo_url: logoUrl,
      description_mn: form.description_mn || null,
      description_en: form.description_en || null,
      sort_order: Number(form.sort_order) || 0,
    };
    const { error } = editingId
      ? await supabase.from("links_partners").update(payload).eq("id", editingId)
      : await supabase.from("links_partners").insert(payload);
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setForm(EMPTY);
    setLogoFile(null);
    setEditingId(null);
    setShowForm(false);
    refresh();
  }

  async function remove(item: LinkRow) {
    if (!confirm(t("Устгах уу?", "Delete this entry?", "削除しますか?", "確定刪除嗎?"))) return;
    await supabase.from("links_partners").delete().eq("id", item.id);
    refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-900">{t("Холбоос ба түншүүд удирдах", "Manage Links & Partners", "リンクとパートナー管理", "管理鏈接與夥伴")}</h2>
        <button
          onClick={() => {
            setEditingId(null);
            setForm(EMPTY);
            setLogoFile(null);
            setShowForm((v) => !v);
          }}
          className="text-sm font-semibold bg-rotary-royal-blue text-white rounded-md px-4 py-2"
        >
          {showForm ? t("Хаах", "Cancel", "キャンセル", "取消") : t("+ Шинэ", "+ New", "+ 新規", "+ 新建")}
        </button>
      </div>

      <p className="text-sm text-slate-500 mb-6 max-w-2xl">
        {t(
          "Энд нэмсэн зүйлс нүүр хуудасны \"Холбоос ба түншүүд\" хэсэгт харагдана — жишээ нь хамтын клубууд.",
          "Anything added here shows up in the \"Links & Partners\" section on the home page — e.g. sister clubs.",
          "ここに追加した項目はホームページの「リンクとパートナー」セクションに表示されます(例:姉妹クラブ)。",
          "在此添加的內容將顯示在首頁的「鏈接與夥伴」區塊——例如姊妹俱樂部。"
        )}
      </p>

      {showForm && (
        <form onSubmit={submit} className="rounded-xl border border-slate-200 p-6 mb-8 grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <input required placeholder={t("Нэр", "Name", "名前", "名稱")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as Category })} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
              {(Object.keys(CATEGORY_LABEL) as Category[]).map((c) => (
                <option key={c} value={c}>{t(CATEGORY_LABEL[c].mn, CATEGORY_LABEL[c].en)}</option>
              ))}
            </select>
          </div>
          <input placeholder={t("Холбоос (URL)", "Website URL", "URL", "網址")} value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-1">{t("Лого (заавал биш)", "Logo (optional)", "ロゴ(任意)", "徽標(可選)")}</p>
            {form.logo_url && !logoFile && (
              <Image src={form.logo_url} alt="" width={56} height={56} className="object-contain mb-2 rounded border border-slate-200 bg-white p-1" />
            )}
            <input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)} className="text-sm" />
          </div>
          <textarea placeholder={t("Тайлбар (MN)", "Description (MN)", "説明(MN)", "描述(MN)")} value={form.description_mn} onChange={(e) => setForm({ ...form, description_mn: e.target.value })} rows={2} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <textarea placeholder={t("Тайлбар (EN)", "Description (EN)", "説明(EN)", "描述(EN)")} value={form.description_en} onChange={(e) => setForm({ ...form, description_en: e.target.value })} rows={2} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input type="number" placeholder={t("Эрэмбэ", "Sort order", "並び順", "排序")} value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} className="rounded-md border border-slate-300 px-3 py-2 text-sm w-40" />

          {error && <p className="text-sm text-rotary-cardinal">{error}</p>}
          <button type="submit" disabled={busy} className="justify-self-start bg-rotary-royal-blue text-white font-semibold rounded-md px-5 py-2 text-sm disabled:opacity-60">
            {busy ? t("Хадгалж байна…", "Saving…", "保存中…", "保存中…") : editingId ? t("Шинэчлэх", "Update", "更新", "更新") : t("Хадгалах", "Save", "保存", "保存")}
          </button>
        </form>
      )}

      {items === null && <p className="text-slate-400 text-sm">{t("Ачааллаж байна…", "Loading…", "読み込み中…", "加載中…")}</p>}
      {items && items.length === 0 && <p className="text-slate-400 text-sm">{t("Жагсаалт хоосон байна.", "Nothing added yet.", "まだ登録されていません。", "暫無記錄。")}</p>}

      <div className="grid gap-3">
        {items?.map((item) => (
          <div key={item.id} className="rounded-xl border border-slate-200 p-4 flex items-start justify-between gap-4">
            <div>
              <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 mb-1">
                {t(CATEGORY_LABEL[item.category].mn, CATEGORY_LABEL[item.category].en)}
              </span>
              <p className="font-bold text-slate-900">{item.name}</p>
              {item.description_en && <p className="text-sm text-slate-500">{t(item.description_mn ?? "", item.description_en)}</p>}
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => startEdit(item)} className="text-xs font-semibold px-3 py-1.5 rounded-md border border-rotary-royal-blue text-rotary-royal-blue hover:bg-rotary-royal-blue hover:text-white">
                {t("Засах", "Edit", "編集", "編輯")}
              </button>
              <button onClick={() => remove(item)} className="text-xs font-semibold px-3 py-1.5 rounded-md border border-rotary-cardinal text-rotary-cardinal hover:bg-rotary-cardinal hover:text-white">
                {t("Устгах", "Delete", "削除", "刪除")}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
