"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/language-context";

type ClubType = "interact" | "rotaract";

type AffiliateRow = {
  id: string;
  name: string;
  club_type: ClubType;
  chartered_date: string | null;
  description_mn: string | null;
  description_en: string | null;
  logo_url: string | null;
  president_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  member_count: number | null;
};

const EMPTY = {
  name: "",
  club_type: "interact" as ClubType,
  chartered_date: "",
  description_mn: "",
  description_en: "",
  logo_url: "",
  president_name: "",
  contact_phone: "",
  contact_email: "",
  member_count: "",
};

export default function AdminAffiliatesPage() {
  const { t } = useLanguage();
  const [items, setItems] = useState<AffiliateRow[] | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function refresh() {
    const { data, error } = await supabase.from("affiliate_clubs").select("*").order("sort_order");
    if (error) setError(error.message);
    else setItems(data as AffiliateRow[]);
  }

  useEffect(() => {
    refresh();
  }, []);

  function startEdit(item: AffiliateRow) {
    setEditingId(item.id);
    setForm({
      name: item.name,
      club_type: item.club_type,
      chartered_date: item.chartered_date ?? "",
      description_mn: item.description_mn ?? "",
      description_en: item.description_en ?? "",
      logo_url: item.logo_url ?? "",
      president_name: item.president_name ?? "",
      contact_phone: item.contact_phone ?? "",
      contact_email: item.contact_email ?? "",
      member_count: item.member_count?.toString() ?? "",
    });
    setShowForm(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const payload = {
      name: form.name,
      club_type: form.club_type,
      chartered_date: form.chartered_date || null,
      description_mn: form.description_mn || null,
      description_en: form.description_en || null,
      logo_url: form.logo_url || null,
      president_name: form.president_name || null,
      contact_phone: form.contact_phone || null,
      contact_email: form.contact_email || null,
      member_count: form.member_count ? Number(form.member_count) : null,
    };
    const { error } = editingId
      ? await supabase.from("affiliate_clubs").update(payload).eq("id", editingId)
      : await supabase.from("affiliate_clubs").insert(payload);
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setForm(EMPTY);
    setEditingId(null);
    setShowForm(false);
    refresh();
  }

  async function remove(item: AffiliateRow) {
    if (!confirm(t("Устгах уу?", "Delete this club?", "削除しますか?", "确定删除吗?"))) return;
    await supabase.from("affiliate_clubs").delete().eq("id", item.id);
    refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-900">{t("Дэмждэг клубууд удирдах", "Manage Sponsored Clubs", "スポンサークラブ管理", "赞助俱乐部管理")}</h2>
        <button
          onClick={() => {
            setEditingId(null);
            setForm(EMPTY);
            setShowForm((v) => !v);
          }}
          className="text-sm font-semibold bg-rotary-royal-blue text-white rounded-md px-4 py-2"
        >
          {showForm ? t("Хаах", "Cancel", "キャンセル", "取消") : t("+ Шинэ клуб", "+ New Club", "+ 新規クラブ", "+ 新建俱乐部")}
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="rounded-xl border border-slate-200 p-6 mb-8 grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <input required placeholder={t("Клубын нэр", "Club name", "クラブ名", "俱乐部名称")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
            <select value={form.club_type} onChange={(e) => setForm({ ...form, club_type: e.target.value as ClubType })} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
              <option value="interact">Interact</option>
              <option value="rotaract">Rotaract</option>
            </select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <input type="date" placeholder={t("Дүрэмт болсон огноо", "Chartered date", "認可日", "注册日期")} value={form.chartered_date} onChange={(e) => setForm({ ...form, chartered_date: e.target.value })} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
            <input type="number" min="0" placeholder={t("Гишүүдийн тоо", "Member count", "会員数", "会员人数")} value={form.member_count} onChange={(e) => setForm({ ...form, member_count: e.target.value })} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <input placeholder={t("Лого URL", "Logo URL", "ロゴURL", "徽标URL")} value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <textarea placeholder={t("Тайлбар (MN)", "Description (MN)", "説明(MN)", "描述(MN)")} value={form.description_mn} onChange={(e) => setForm({ ...form, description_mn: e.target.value })} rows={2} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <textarea placeholder={t("Тайлбар (EN)", "Description (EN)", "説明(EN)", "描述(EN)")} value={form.description_en} onChange={(e) => setForm({ ...form, description_en: e.target.value })} rows={2} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />

          <p className="text-sm font-semibold text-slate-700 mt-2">{t("Холбоо барих (тэргүүн)", "Contact (club president)", "連絡先(会長)", "联系方式(社长)")}</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <input placeholder={t("Тэргүүний нэр", "President's name", "会長名", "社长姓名")} value={form.president_name} onChange={(e) => setForm({ ...form, president_name: e.target.value })} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
            <input placeholder={t("Утас", "Phone", "電話", "电话")} value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
            <input type="email" placeholder={t("И-мэйл", "Email", "メール", "邮箱")} value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>

          {error && <p className="text-sm text-rotary-cardinal">{error}</p>}
          <button type="submit" disabled={busy} className="justify-self-start bg-rotary-royal-blue text-white font-semibold rounded-md px-5 py-2 text-sm disabled:opacity-60">
            {busy ? t("Хадгалж байна…", "Saving…", "保存中…", "保存中…") : editingId ? t("Шинэчлэх", "Update", "更新", "更新") : t("Хадгалах", "Save", "保存", "保存")}
          </button>
        </form>
      )}

      {items === null && <p className="text-slate-400 text-sm">{t("Ачааллаж байна…", "Loading…", "読み込み中…", "加载中…")}</p>}
      {items && items.length === 0 && <p className="text-slate-400 text-sm">{t("Клуб алга.", "No sponsored clubs yet.", "クラブがありません。", "暂无赞助俱乐部。")}</p>}

      <div className="grid gap-4">
        {items?.map((item) => (
          <div key={item.id} className="rounded-xl border border-slate-200 p-5 flex items-start justify-between gap-4">
            <div>
              <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 mb-1 uppercase">
                {item.club_type}
              </span>
              <p className="font-bold text-slate-900">{item.name}{item.member_count != null && ` · ${item.member_count} ${t("гишүүн", "members")}`}</p>
              {item.president_name && <p className="text-sm text-slate-500">{item.president_name} · {item.contact_phone} · {item.contact_email}</p>}
            </div>
            <div className="flex flex-col gap-2 shrink-0">
              <button onClick={() => startEdit(item)} className="text-xs font-semibold px-3 py-1.5 rounded-md border border-rotary-royal-blue text-rotary-royal-blue hover:bg-rotary-royal-blue hover:text-white">
                {t("Засах", "Edit", "編集", "编辑")}
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
