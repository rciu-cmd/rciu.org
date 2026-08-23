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
  status: "pending" | "active" | "inactive";
  is_admin: boolean;
};

export default function AdminMembersPage() {
  const { t } = useLanguage();
  const [items, setItems] = useState<MemberRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const { data, error } = await supabase
      .from("members")
      .select("id, member_id, first_name, last_name, email, status, is_admin")
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
          <div className="grid gap-2">
            {others.map((m) => (
              <div key={m.id} className="rounded-lg border border-slate-200 p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900">
                    {m.first_name} {m.last_name}
                    {m.is_admin && <span className="ml-2 text-xs font-bold text-rotary-royal-blue">ADMIN</span>}
                  </p>
                  <p className="text-xs text-slate-500">{m.email} · {m.member_id}</p>
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
                    onClick={() => toggleAdmin(m)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-md border ${m.is_admin ? "border-rotary-cardinal text-rotary-cardinal" : "border-rotary-royal-blue text-rotary-royal-blue"}`}
                  >
                    {m.is_admin ? t("Админ хасах", "Revoke Admin", "管理者権限を削除", "移除管理员") : t("Админ болгох", "Make Admin", "管理者にする", "设为管理员")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
