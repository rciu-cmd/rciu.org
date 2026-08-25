"use client";

import { Fragment, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/language-context";

type AdminLevel = "none" | "editor" | "super";

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
  admin_level: AdminLevel;
};

type EditForm = { phone: string; rotary_id: string; highest_position: string; honor_roll_priority: string };

export default function AdminMembersPage() {
  const { t } = useLanguage();
  const [items, setItems] = useState<MemberRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EditForm>({ phone: "", rotary_id: "", highest_position: "", honor_roll_priority: "" });
  const [busy, setBusy] = useState(false);

  // Email is edited directly in its own table column now (not the
  // expandable "Edit" panel below) — one draft string per member,
  // saved individually on blur/Enter so it doesn't get tangled up
  // with the other fields' save flow.
  const [emailDrafts, setEmailDrafts] = useState<Record<string, string>>({});
  const [savingEmailId, setSavingEmailId] = useState<string | null>(null);

  // Whose row is "me" — used to disable editing your own admin level
  // in this table (the database also hard-blocks this via a trigger;
  // disabling it here is just so that's not a confusing dead click).
  const [selfId, setSelfId] = useState<string | null>(null);
  const [savingLevelId, setSavingLevelId] = useState<string | null>(null);

  async function refresh() {
    const { data, error } = await supabase
      .from("members")
      .select("id, member_id, first_name, last_name, email, phone, rotary_id, highest_position, honor_roll_priority, status, is_admin, admin_level")
      .order("status", { ascending: true })
      .order("last_name", { ascending: true });
    if (error) setError(error.message);
    else {
      const rows = data as MemberRow[];
      setItems(rows);
      setEmailDrafts(Object.fromEntries(rows.map((m) => [m.id, m.email ?? ""])));
    }
  }

  useEffect(() => {
    refresh();
    supabase.auth.getSession().then(({ data: { session } }) => setSelfId(session?.user.id ?? null));
  }, []);

  async function saveEmail(m: MemberRow) {
    const value = (emailDrafts[m.id] ?? "").trim();
    if (value === (m.email ?? "")) return; // unchanged, nothing to save
    setSavingEmailId(m.id);
    setError(null);
    const { error } = await supabase.from("members").update({ email: value }).eq("id", m.id);
    setSavingEmailId(null);
    if (error) {
      setError(error.message);
      return;
    }
    refresh();
  }

  async function setStatus(m: MemberRow, status: MemberRow["status"]) {
    await supabase.from("members").update({ status }).eq("id", m.id);
    refresh();
  }

  async function setAdminLevel(m: MemberRow, level: AdminLevel) {
    if (level === m.admin_level) return;
    setSavingLevelId(m.id);
    setError(null);
    const { error } = await supabase.from("members").update({ admin_level: level }).eq("id", m.id);
    setSavingLevelId(null);
    if (error) {
      setError(error.message);
      return;
    }
    refresh();
  }

  function startEdit(m: MemberRow) {
    setEditingId(m.id);
    setForm({
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
              "И-мэйлийг доор шууд засварлаж болно. Утас, Rotary ID, хамгийн өндөр албан тушаалыг «Засах» дарж бөглөнө үү.",
              "Email can be edited directly below. Phone, Rotary ID, and highest position — click \"Edit\" to fill them in.",
              "メールは下で直接編集できます。電話番号、Rotary ID、最高役職は「編集」で入力してください。",
              "邮箱可在下方直接编辑。电话、Rotary ID 和最高职位请点击「编辑」填写。"
            )}
          </p>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left text-xs font-semibold text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                  <th className="py-2.5 px-3">{t("Нэр", "Name", "氏名", "姓名")}</th>
                  <th className="py-2.5 px-3">{t("И-мэйл", "Email", "メール", "邮箱")}</th>
                  <th className="py-2.5 px-3 hidden sm:table-cell">{t("Утас", "Phone", "電話", "电话")}</th>
                  <th className="py-2.5 px-3">{t("Төлөв", "Status", "状態", "状态")}</th>
                  <th className="py-2.5 px-3">{t("Үйлдэл", "Actions", "操作", "操作")}</th>
                </tr>
              </thead>
              <tbody>
                {others.map((m) => (
                  <Fragment key={m.id}>
                    <tr className="border-b border-slate-100 align-top hover:bg-slate-50/60">
                      <td className="py-2.5 px-3">
                        <p className="font-medium text-slate-900 whitespace-nowrap">
                          {m.first_name} {m.last_name}
                          {m.admin_level === "super" && <span className="ml-2 text-[10px] font-bold text-rotary-royal-blue">SUPER</span>}
                          {m.admin_level === "editor" && <span className="ml-2 text-[10px] font-bold text-rotary-azure">EDITOR</span>}
                        </p>
                        <p className="text-xs text-slate-400">{m.member_id}</p>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="email"
                            value={emailDrafts[m.id] ?? ""}
                            onChange={(e) => setEmailDrafts((prev) => ({ ...prev, [m.id]: e.target.value }))}
                            onBlur={() => saveEmail(m)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                            }}
                            className="w-full min-w-[180px] rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-rotary-royal-blue focus:outline-none"
                          />
                          {savingEmailId === m.id && <span className="text-[10px] text-slate-400 shrink-0">{t("Хадгалж байна…", "Saving…", "保存中…", "保存中…")}</span>}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 hidden sm:table-cell text-slate-600 whitespace-nowrap">{m.phone || "—"}</td>
                      <td className="py-2.5 px-3">
                        <select
                          value={m.status}
                          onChange={(e) => setStatus(m, e.target.value as MemberRow["status"])}
                          className="text-xs rounded-md border border-slate-300 px-2 py-1"
                        >
                          <option value="active">{t("Идэвхтэй", "Active", "現役", "活跃")}</option>
                          <option value="inactive">{t("Идэвхгүй", "Inactive", "非活動", "非活跃")}</option>
                          <option value="pending">{t("Хүлээгдэж буй", "Pending", "保留中", "待定")}</option>
                        </select>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => (editingId === m.id ? setEditingId(null) : startEdit(m))}
                            className="text-xs font-semibold px-2.5 py-1 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50 whitespace-nowrap"
                          >
                            {editingId === m.id ? t("Хаах", "Cancel", "キャンセル", "取消") : t("Засах", "Edit", "編集", "编辑")}
                          </button>
                          <select
                            value={m.admin_level}
                            onChange={(e) => setAdminLevel(m, e.target.value as AdminLevel)}
                            disabled={m.id === selfId || savingLevelId === m.id}
                            title={m.id === selfId ? t("Өөрийн эрхээ энд өөрчлөх боломжгүй.", "You can't change your own level here.", "自分の権限はここでは変更できません。", "无法在此更改自己的权限。") : undefined}
                            className="text-xs rounded-md border border-slate-300 px-2 py-1 disabled:opacity-50 disabled:bg-slate-50"
                          >
                            <option value="none">{t("Админ биш", "Not admin", "管理者ではない", "非管理员")}</option>
                            <option value="editor">{t("Editor (мэдээ, төсөл)", "Editor (news + projects)", "編集者(ニュース・プロジェクト)", "编辑(新闻+项目)")}</option>
                            <option value="super">{t("Super (бүх эрх)", "Super (full access)", "スーパー(全権限)", "超级(全部权限)")}</option>
                          </select>
                        </div>
                      </td>
                    </tr>
                    {editingId === m.id && (
                      <tr key={`${m.id}-edit`} className="border-b border-slate-100 bg-slate-50/60">
                        <td colSpan={5} className="p-4">
                          <div className="grid gap-3 sm:grid-cols-2">
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
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
