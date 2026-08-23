"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/language-context";

type Status = "new" | "contacted" | "closed";

type InquiryRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string | null;
  status: Status;
  created_at: string;
};

export default function AdminJoinInquiriesPage() {
  const { t } = useLanguage();
  const [items, setItems] = useState<InquiryRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const { data, error } = await supabase.from("join_inquiries").select("*").order("created_at", { ascending: false });
    if (error) setError(error.message);
    else setItems(data as InquiryRow[]);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function setStatus(item: InquiryRow, status: Status) {
    await supabase.from("join_inquiries").update({ status }).eq("id", item.id);
    refresh();
  }

  async function remove(item: InquiryRow) {
    if (!confirm(t("Устгах уу?", "Delete this inquiry?", "削除しますか?", "确定删除吗?"))) return;
    await supabase.from("join_inquiries").delete().eq("id", item.id);
    refresh();
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-slate-900 mb-6">{t("Элсэх хүсэлтүүд", "Join Inquiries", "入会お問い合わせ", "入会申请")}</h2>
      {error && <p className="text-sm text-rotary-cardinal mb-4">{error}</p>}
      {items === null && <p className="text-slate-400 text-sm">{t("Ачааллаж байна…", "Loading…", "読み込み中…", "加载中…")}</p>}
      {items && items.length === 0 && <p className="text-slate-400 text-sm">{t("Одоогоор хүсэлт алга.", "No inquiries yet.", "お問い合わせはまだありません。", "暂无申请。")}</p>}

      <div className="grid gap-3">
        {items?.map((item) => (
          <div key={item.id} className="rounded-xl border border-slate-200 p-5 flex items-start justify-between gap-4">
            <div>
              <p className="font-bold text-slate-900">{item.name}</p>
              <p className="text-sm text-slate-500">{item.email}{item.phone && ` · ${item.phone}`}</p>
              {item.message && <p className="text-sm text-slate-600 mt-2 max-w-lg">{item.message}</p>}
              <p className="text-xs text-slate-400 mt-2">{new Date(item.created_at).toLocaleDateString()}</p>
            </div>
            <div className="flex flex-col gap-2 items-end shrink-0">
              <select
                value={item.status}
                onChange={(e) => setStatus(item, e.target.value as Status)}
                className="text-xs rounded-md border border-slate-300 px-2 py-1"
              >
                <option value="new">{t("Шинэ", "New", "新規", "新")}</option>
                <option value="contacted">{t("Холбогдсон", "Contacted", "連絡済み", "已联系")}</option>
                <option value="closed">{t("Хаагдсан", "Closed", "終了", "已关闭")}</option>
              </select>
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
