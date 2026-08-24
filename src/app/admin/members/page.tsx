"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/language-context";

type MemberRow = {
  id: string;
  member_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  rotary_id: string | null;
  highest_position: string | null;
  honor_roll_priority: number | null;
  status: "pending" | "active" | "inactive";
  is_admin: boolean;
};

type EditForm = { email: string; phone: string; rotary_id: string; highest_position: string; honor_roll_priority: string };

export default function AdminMembersPage() {
  const { t } = useLanguage();
  const [items, setItems] = useState<MemberRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EditForm>({ email: "", phone: "", rotary_id: "", highest_position: "", honor_roll_priority: "" });
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const { data, error } = await supabase
      .from("members")
      .select("id, member_id, first_name, last_name, email, phone, rotary_id, highest_position, honor_roll_priority, status, is_admin")
      .order("status", { ascending: true })
      .order("last_name", { ascending: true });
    if (error) setError(error.message);
    else setItems(data as MemberRow[]);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function setStatus(m: MemberRow, status: MemberRow["status"]) {
    await supabase.from("members").update({ status }).eq("id", m.id);
    refresh();
  }

  async function toggleAdmin(m: MemberRow) {
    if (!confirm(
      m.is_admin
        ? t("Админ эрхийг хасах уу?", "Remove admin access?", "管理者権限を削除しますか?", "确定移除管理员权限吗?")
        : t("Админ эрх өгөх үү?", "Grant admin access?", "管理者権限を付与しますか?", "确定授予管理员权限吗?")
    )) return;
    await supabase.from("members").update({ is_admin: !m.is_admin }).eq("id", m.id);
    refresh();
  }

  function startEdit(m: MemberRow) {
    setEditingId(m.id);
    setForm({
      email: m.email ?? "",
      phone: m.phone ?? "",
      rotary_id: m.rotary_id ?? "",
      highest_position: m.highest_position ?? "",
      honor_roll_priority: m.honor_roll_priority != null ? String(m.honor_roll_priority) : "",
    });
  }

  async function saveEdit(id: string) {
    setBusy(true);
    const { error } = await supabase
      .from("members")
      .update({
        email: form.email,
        phone: form.phone || null,
        rotary_id: form.rotary_id || null,
        highest_position: form.highest_position || null,
        honor_roll_priority: form.honor_roll_priority.trim() === "" ? null : Number(form.honor_roll_priority),
      })
      .eq("id", id);
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setEditingId(null);
    refresh();
  }

  const pending = items?.filter((m) => m.status === "pending") ?? [];
  const others = items?.filter((m) => m.status !== "pending") ?? [];

  return (
    <div>
      <h2 className="text-xl font-bold text-slate-900 mb-6">{t("Гишүүд удирдах", "Manage Members", "会員管理", "会员管理")}</h2>

      {error && <p className="text-sm text-rotary-cardinal mb-4">{error}</p>}
      {items === null && <p className="text-slate-400 text-sm">{t("Ачааллаж байна…", "Loading…", "読み込み中…", "加载中…")}</p>}

      {items && pending.length > 0 && (
        <div className="mb-10">
          <h3 className="font-semibold text-rotary-gold mb-3">{t("Зөвшөөрөл хүлээж буй", "Awaiting approval", "承認待ち", "待审核")}</h3>
          <div className="grid gap-3">
            {pending.map((m) => (
              <div key={m.id} className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900">{m.first_name} {m.last_name}</p>
                  <p className="text-xs text-slate-500">{m.email}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setStatus(m, "active")} className="text-xs font-semibold px-3 py-1.5 rounded-md bg-green-600 text-white">
                    {t("Зөвшөөрөх", "Approve", "承認", "批准")}
                  </button>
                  <button onClick={() => setStatus(m, "inactive")} className="text-xs font-semibold px-3 py-1.5 rounded-md border border-slate-300 text-slate-600">
                    {t("Татгалзах", "Reject", "却下", "拒绝")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {items && (
        <div>
          <h3 className="font-semibold text-slate-700 mb-3">{t("Бүх гишүүд", "All Members", "全会員", "全部会员")}</h3>
          <p className="text-xs text-slate-400 mb-4 max-w-xl">
            {t(
              "Утас, Rotary ID, хамгийн өндөр албан тушаал талбарууд одоогоор хоосон байна — «Засах» дарж бөглөнө үү.",
              "Phone, Rotary ID, and highest position are currently blank for everyone — click \"Edit\" to fill them in.",
              "電話番号、Rotary ID、最高役職は現在すべて空欄です — 「編集」で入力してください。",
              "电话、Rotary ID 和最高职位目前均为空 — 点击「编辑」填写。"
            )}
          </p>
          <div className="grid gap-2">
            {others.map((m) => (
              <div key={m.id} className="rounded-lg border border-slate-200 p-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="font-medium text-slate-900">
                      {m.first_name} {m.last_name}
                      {m.is_admin && <span className="ml-2 text-xs font-bold text-rotary-royal-blue">ADMIN</span>}
                    </p>
                    <p className="text-xs text-slate-500">{m.email} · {m.member_id}</p>
                    <p className="text-xs text-slate-400">
                      {m.phone || t("утасгүй", "no phone")} · {m.rotary_id ? `Rotary ID: ${m.rotary_id}` : t("Rotary ID алга", "no Rotary ID")}
                      {m.highest_position && ` · ${m.highest_position}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={m.status}
                      onChange={(e) => setStatus(m, e.target.value as MemberRow["status"])}
                      className="text-xs rounded-md border border-slate-300 px-2 py-1"
                    >
                      <option value="active">{t("Идэвхтэй", "Active", "現役", "活跃")}</option>
                      <option value="inactive">{t("Идэвхгүй", "Inactive", "非活動", "非活跃")}</option>
                      <option value="pending">{t("Хүлээгдэж буй", "Pending", "保留中", "待定")}</option>
                    </select>
                    <button
                      onClick={() => (editingId === m.id ? setEditingId(null) : startEdit(m))}
                      className="text-xs font-semibold px-3 py-1.5 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50"
                    >
                      {editingId === m.id ? t("Хаах", "Cancel", "キャンセル", "取消") : t("Засах", "Edit", "編集", "编辑")}
                    </button>
                    <button
                      onClick={() => toggleAdmin(m)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-md border ${m.is_admin ? "border-rotary-cardinal text-rotary-cardinal" : "border-rotary-royal-blue text-rotary-royal-blue"}`}
                    >
                      {m.is_admin ? t("Админ хасах", "Revoke Admin", "管理者権限を削除", "移除管理员") : t("Админ болгох", "Make Admin", "管理者にする", "设为管理员")}
                    </button>
                  </div>
                </div>

                {editingId === m.id && (
                  <div className="mt-4 pt-4 border-t border-slate-100 grid gap-3 sm:grid-cols-2">
                    <input
                      type="email"
                      placeholder={t("И-мэйл", "Email", "メール", "邮箱")}
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                    />
                    <input
                      placeholder={t("Утас", "Phone", "電話", "电话")}
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                    />
                    <input
                      placeholder="Rotary ID"
                      value={form.rotary_id}
                      onChange={(e) => setForm({ ...form, rotary_id: e.target.value })}
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                    />
                    <input
                      placeholder={t("Хамгийн өндөр албан тушаал (жишээ: Клубын Ерөнхийлөгч 2020-21)", "Highest position (e.g. Club President 2020-21)", "最高役職(例:クラブ会長 2020-21)", "最高职位(例:俱乐部社长 2020-21)")}
                      value={form.highest_position}
                      onChange={(e) => setForm({ ...form, highest_position: e.target.value })}
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
                    />
                    <input
                      type="number"
                      placeholder={t("Алдрын самбарын байрлал (заавал биш — 1 = хамгийн эхэнд)", "Honor roll pin order (optional — 1 = shows first)", "名誉殿堂の順位(任意 — 1 = 最初に表示)", "荣誉榜排序(可选 — 1 = 最先显示)")}
                      value={form.honor_roll_priority}
                      onChange={(e) => setForm({ ...form, honor_roll_priority: e.target.value })}
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
                    />
                    <button
                      onClick={() => saveEdit(m.id)}
                      disabled={busy}
                      className="justify-self-start bg-rotary-royal-blue text-white font-semibold rounded-md px-5 py-2 text-sm disabled:opacity-60 sm:col-span-2"
                    >
                      {busy ? t("Хадгалж байна…", "Saving…", "保存中…", "保存中…") : t("Хадгалах", "Save", "保存", "保存")}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
