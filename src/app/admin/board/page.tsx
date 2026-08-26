"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/language-context";

type MemberOption = { id: string; first_name: string; last_name: string };

type BoardRow = {
  id: string;
  member_id: string;
  role_mn: string;
  role_en: string;
  rotary_year: string;
  sort_order: number;
  photo_url: string | null;
  members: { first_name: string; last_name: string; photo_url: string | null } | null;
};

const EMPTY = {
  member_id: "",
  role_mn: "",
  role_en: "",
  rotary_year: "2026-2027",
  sort_order: "0",
  photo_url: "",
};

export default function AdminBoardPage() {
  const { t } = useLanguage();
  const [rows, setRows] = useState<BoardRow[] | null>(null);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const { data, error } = await supabase
      .from("board_positions")
      .select("id, member_id, role_mn, role_en, rotary_year, sort_order, photo_url, members(first_name, last_name, photo_url)")
      .order("sort_order");
    if (error) setError(error.message);
    else setRows(data as unknown as BoardRow[]);
  }

  useEffect(() => {
    refresh();
    supabase
      .from("members")
      .select("id, first_name, last_name")
      .eq("status", "active")
      .order("last_name")
      .then(({ data }) => setMembers((data as MemberOption[]) ?? []));
  }, []);

  function startEdit(r: BoardRow) {
    setEditingId(r.id);
    setForm({
      member_id: r.member_id,
      role_mn: r.role_mn,
      role_en: r.role_en,
      rotary_year: r.rotary_year,
      sort_order: String(r.sort_order),
      photo_url: r.photo_url ?? "",
    });
    setFile(null);
    setShowForm(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.member_id) {
      setError(t("Гишүүн сонгоно уу.", "Please select a member.", "会員を選択してください。", "請選擇會員。"));
      return;
    }
    setBusy(true);
    setError(null);

    let photoUrl = form.photo_url || null;
    if (file) {
      const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
      const path = `board/${form.rotary_year}/${Date.now()}-${safeName}`;
      const { error: uploadError } = await supabase.storage.from("rciu-photos").upload(path, file);
      if (uploadError) {
        setBusy(false);
        setError(uploadError.message);
        return;
      }
      photoUrl = supabase.storage.from("rciu-photos").getPublicUrl(path).data.publicUrl;
    }

    const payload = {
      member_id: form.member_id,
      role_mn: form.role_mn,
      role_en: form.role_en,
      rotary_year: form.rotary_year,
      sort_order: Number(form.sort_order) || 0,
      photo_url: photoUrl,
    };

    const { error } = editingId
      ? await supabase.from("board_positions").update(payload).eq("id", editingId)
      : await supabase.from("board_positions").insert(payload);

    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setForm(EMPTY);
    setFile(null);
    setEditingId(null);
    setShowForm(false);
    refresh();
  }

  async function remove(r: BoardRow) {
    if (!confirm(t("Устгах уу?", "Delete this board position?", "削除しますか?", "確定刪除嗎?"))) return;
    await supabase.from("board_positions").delete().eq("id", r.id);
    refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-900">{t("Удирдлага удирдах", "Manage Board", "役員管理", "理事會管理")}</h2>
        <button
          onClick={() => {
            setEditingId(null);
            setForm(EMPTY);
            setFile(null);
            setShowForm((v) => !v);
          }}
          className="text-sm font-semibold bg-rotary-royal-blue text-white rounded-md px-4 py-2"
        >
          {showForm ? t("Хаах", "Cancel", "キャンセル", "取消") : t("+ Нэмэх", "+ Add", "+ 追加", "+ 添加")}
        </button>
      </div>

      <p className="text-sm text-slate-500 mb-6 max-w-2xl">
        {t(
          "\"Эрэмбэ\" талбар нь Rotary протоколын дараалал (Тэргүүн, Дэд тэргүүн, Нарийн бичиг, гэх мэт) — жижиг тоо түрүүлж харагдана.",
          "\"Sort order\" controls the Rotary-protocol display order (President, Vice President, Secretary, etc.) — lower numbers show first.",
          "「並び順」はロータリーの慣例順(会長、副会長、書記など)を制御します — 数字が小さいほど先に表示されます。",
          "「排序」控制羅特里協議順序(社長、副社長、秘書等)——數字越小越靠前。"
        )}
      </p>

      {showForm && (
        <form onSubmit={submit} className="rounded-xl border border-slate-200 p-6 mb-8 grid gap-3">
          <select required value={form.member_id} onChange={(e) => setForm({ ...form, member_id: e.target.value })} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="">{t("Гишүүн сонгох", "Select member", "会員を選択", "選擇會員")}</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
            ))}
          </select>
          <div className="grid gap-3 sm:grid-cols-2">
            <input required placeholder={t("Албан тушаал (MN)", "Role (MN)", "役職(MN)", "職位(MN)")} value={form.role_mn} onChange={(e) => setForm({ ...form, role_mn: e.target.value })} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
            <input required placeholder={t("Албан тушаал (EN)", "Role (EN)", "役職(EN)", "職位(EN)")} value={form.role_en} onChange={(e) => setForm({ ...form, role_en: e.target.value })} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <input required placeholder={t("Rotary жил (жишээ: 2026-2027)", "Rotary year (e.g. 2026-2027)", "ロータリー年度(例:2026-2027)", "扶輪年度(例:2026-2027)")} value={form.rotary_year} onChange={(e) => setForm({ ...form, rotary_year: e.target.value })} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
            <input type="number" placeholder={t("Эрэмбэ (жишээ: Тэргүүн=1)", "Sort order (e.g. President=1)", "並び順(例:会長=1)", "排序(例:社長=1)")} value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-700 mb-1">{t("Зураг (заавал биш)", "Photo (optional)", "写真(任意)", "照片(可選)")}</p>
            <p className="text-xs text-slate-400 mb-2">
              {t("Хоосон орхивол гишүүний өөрийн профайл зургийг ашиглана.", "Leave blank to fall back to the member's own profile photo.", "空欄の場合は会員自身のプロフィール写真が使用されます。", "留空則使用會員本人的頭像。")}
            </p>
            {form.photo_url && !file && (
              <Image src={form.photo_url} alt="" width={48} height={48} className="rounded-full object-cover mb-2" />
            )}
            <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-sm" />
          </div>

          {error && <p className="text-sm text-rotary-cardinal">{error}</p>}
          <button type="submit" disabled={busy} className="justify-self-start bg-rotary-royal-blue text-white font-semibold rounded-md px-5 py-2 text-sm disabled:opacity-60">
            {busy ? t("Хадгалж байна…", "Saving…", "保存中…", "保存中…") : editingId ? t("Шинэчлэх", "Update", "更新", "更新") : t("Хадгалах", "Save", "保存", "保存")}
          </button>
        </form>
      )}

      {rows === null && <p className="text-slate-400 text-sm">{t("Ачааллаж байна…", "Loading…", "読み込み中…", "加載中…")}</p>}
      {rows && rows.length === 0 && <p className="text-slate-400 text-sm">{t("Удирдлага алга.", "No board positions yet.", "役員がありません。", "暫無理事會成員。")}</p>}

      <div className="grid gap-2">
        {rows?.map((r) => {
          const photo = r.photo_url ?? r.members?.photo_url ?? null;
          return (
            <div key={r.id} className="rounded-lg border border-slate-200 p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                  {photo ? <Image src={photo} alt="" width={40} height={40} className="object-cover" /> : <span className="text-xs text-slate-400">{r.members?.first_name?.[0]}</span>}
                </span>
                <div>
                  <span className="font-semibold text-slate-900">{r.members?.first_name} {r.members?.last_name}</span>
                  <span className="text-sm text-slate-500 ml-2">{r.role_en} · {r.rotary_year} · #{r.sort_order}</span>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => startEdit(r)} className="text-xs font-semibold px-3 py-1.5 rounded-md border border-rotary-royal-blue text-rotary-royal-blue hover:bg-rotary-royal-blue hover:text-white">
                  {t("Засах", "Edit", "編集", "編輯")}
                </button>
                <button onClick={() => remove(r)} className="text-xs font-semibold px-3 py-1.5 rounded-md border border-rotary-cardinal text-rotary-cardinal hover:bg-rotary-cardinal hover:text-white">
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
