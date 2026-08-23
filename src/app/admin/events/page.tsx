"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/language-context";

type Category = "installation_ceremony" | "district_events" | "projects" | "other";

type EventRow = {
  id: string;
  title_mn: string;
  title_en: string;
  description_mn: string | null;
  description_en: string | null;
  location: string | null;
  event_date: string;
  event_time: string | null;
  category: Category | null;
};

const CATEGORY_LABELS: Record<Category, { mn: string; en: string }> = {
  installation_ceremony: { mn: "Албан ёсны хүлээлцэх ёслол", en: "Installation Ceremony" },
  district_events: { mn: "Дүүргийн арга хэмжээ", en: "District Event" },
  projects: { mn: "Төслийн арга хэмжээ", en: "Project Event" },
  other: { mn: "Бусад", en: "Other" },
};

const EMPTY = {
  title_mn: "",
  title_en: "",
  description_mn: "",
  description_en: "",
  location: "",
  event_date: "",
  event_time: "",
  category: "other" as Category,
};

export default function AdminEventsPage() {
  const { t } = useLanguage();
  const [items, setItems] = useState<EventRow[] | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [reminderStatus, setReminderStatus] = useState<Record<string, string>>({});

  async function refresh() {
    const { data, error } = await supabase.from("events").select("*").order("event_date", { ascending: true });
    if (error) setError(error.message);
    else setItems(data as EventRow[]);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function createEvent(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.from("events").insert({
      title_mn: form.title_mn,
      title_en: form.title_en,
      description_mn: form.description_mn || null,
      description_en: form.description_en || null,
      location: form.location || null,
      event_date: form.event_date,
      event_time: form.event_time || null,
      category: form.category,
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

  async function remove(item: EventRow) {
    if (!confirm(t("Устгах уу?", "Delete this event?", "削除しますか?", "确定删除吗?"))) return;
    await supabase.from("events").delete().eq("id", item.id);
    refresh();
  }

  async function sendReminder(item: EventRow) {
    setReminderStatus((s) => ({ ...s, [item.id]: "sending" }));
    const { data, error } = await supabase.functions.invoke("send-event-reminder", {
      body: { event_id: item.id },
    });
    if (error) {
      setReminderStatus((s) => ({ ...s, [item.id]: `error: ${error.message}` }));
      return;
    }
    setReminderStatus((s) => ({ ...s, [item.id]: `sent: ${data?.sent ?? "?"}` }));
  }

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = items?.filter((e) => e.event_date >= today) ?? [];
  const past = items?.filter((e) => e.event_date < today) ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-900">{t("Хуанли удирдах", "Manage Calendar", "カレンダー管理", "日历管理")}</h2>
        <button onClick={() => setShowForm((v) => !v)} className="text-sm font-semibold bg-rotary-royal-blue text-white rounded-md px-4 py-2">
          {showForm ? t("Хаах", "Cancel", "キャンセル", "取消") : t("+ Шинэ үйл явдал", "+ New Event", "+ 新規イベント", "+ 新建活动")}
        </button>
      </div>

      <p className="text-sm text-slate-500 mb-6 max-w-2xl">
        {t(
          "Гишүүд энэ хуанлийг зөвхөн өөрсдийн профайл дээрээс харна. Сануулга и-мэйл автоматаар биш, доорх товчоор гараар илгээгдэнэ.",
          "Members see this calendar only from their own dashboard. Reminder emails are not automatic — send them manually with the button below, whenever you'd like.",
          "会員はこのカレンダーを自分のダッシュボードからのみ閲覧できます。リマインダーメールは自動送信されません。下のボタンで手動で送信してください。",
          "会员只能在自己的主页看到此日历。提醒邮件不会自动发送——请使用下方按钮手动发送。"
        )}
      </p>

      {showForm && (
        <form onSubmit={createEvent} className="rounded-xl border border-slate-200 p-6 mb-8 grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <input required placeholder={t("Гарчиг (MN)", "Title (MN)", "タイトル(MN)", "标题(MN)")} value={form.title_mn} onChange={(e) => setForm({ ...form, title_mn: e.target.value })} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
            <input required placeholder={t("Гарчиг (EN)", "Title (EN)", "タイトル(EN)", "标题(EN)")} value={form.title_en} onChange={(e) => setForm({ ...form, title_en: e.target.value })} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <input required type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
            <input placeholder={t("Цаг (заавал биш)", "Time (optional)", "時間(任意)", "时间(可选)")} value={form.event_time} onChange={(e) => setForm({ ...form, event_time: e.target.value })} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as Category })} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
              {(Object.keys(CATEGORY_LABELS) as Category[]).map((c) => (
                <option key={c} value={c}>{t(CATEGORY_LABELS[c].mn, CATEGORY_LABELS[c].en)}</option>
              ))}
            </select>
          </div>
          <input placeholder={t("Байршил", "Location", "場所", "地点")} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <textarea placeholder={t("Тайлбар (MN)", "Description (MN)", "説明(MN)", "描述(MN)")} value={form.description_mn} onChange={(e) => setForm({ ...form, description_mn: e.target.value })} rows={2} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <textarea placeholder={t("Тайлбар (EN)", "Description (EN)", "説明(EN)", "描述(EN)")} value={form.description_en} onChange={(e) => setForm({ ...form, description_en: e.target.value })} rows={2} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          {error && <p className="text-sm text-rotary-cardinal">{error}</p>}
          <button type="submit" disabled={busy} className="justify-self-start bg-rotary-royal-blue text-white font-semibold rounded-md px-5 py-2 text-sm disabled:opacity-60">
            {busy ? t("Хадгалж байна…", "Saving…", "保存中…", "保存中…") : t("Хадгалах", "Save Event", "保存", "保存")}
          </button>
        </form>
      )}

      {items === null && <p className="text-slate-400 text-sm">{t("Ачааллаж байна…", "Loading…", "読み込み中…", "加载中…")}</p>}

      {items && (
        <>
          <h3 className="font-semibold text-slate-700 mb-3">{t("Удахгүй болох", "Upcoming", "今後の予定", "即将举行")}</h3>
          <div className="grid gap-3 mb-10">
            {upcoming.length === 0 && <p className="text-slate-400 text-sm">{t("Төлөвлөсөн үйл явдал алга.", "No upcoming events.", "予定されているイベントはありません。", "暂无即将举行的活动。")}</p>}
            {upcoming.map((ev) => (
              <div key={ev.id} className="rounded-xl border border-slate-200 p-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold text-rotary-azure">
                    {ev.event_date}{ev.event_time ? ` · ${ev.event_time}` : ""}
                    {ev.category && ` · ${t(CATEGORY_LABELS[ev.category].mn, CATEGORY_LABELS[ev.category].en)}`}
                  </p>
                  <p className="font-bold text-slate-900">{ev.title_en}</p>
                  {ev.location && <p className="text-sm text-slate-500">{ev.location}</p>}
                </div>
                <div className="flex flex-col gap-2 items-end shrink-0">
                  <button
                    onClick={() => sendReminder(ev)}
                    disabled={reminderStatus[ev.id] === "sending"}
                    className="text-xs font-semibold px-3 py-1.5 rounded-md bg-rotary-gold text-[#5a3d0a] disabled:opacity-60"
                  >
                    {reminderStatus[ev.id] === "sending"
                      ? t("Илгээж байна…", "Sending…", "送信中…", "发送中…")
                      : t("Сануулга илгээх", "Send Reminder", "リマインダー送信", "发送提醒")}
                  </button>
                  {reminderStatus[ev.id] && reminderStatus[ev.id] !== "sending" && (
                    <p className="text-xs text-slate-500 max-w-[14rem] text-right">{reminderStatus[ev.id]}</p>
                  )}
                  <button onClick={() => remove(ev)} className="text-xs font-semibold px-3 py-1.5 rounded-md border border-rotary-cardinal text-rotary-cardinal hover:bg-rotary-cardinal hover:text-white">
                    {t("Устгах", "Delete", "削除", "删除")}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {past.length > 0 && (
            <>
              <h3 className="font-semibold text-slate-400 mb-3">{t("Өнгөрсөн", "Past", "過去", "过去")}</h3>
              <div className="grid gap-2">
                {past.map((ev) => (
                  <div key={ev.id} className="rounded-lg border border-slate-100 p-3 flex items-center justify-between text-slate-400">
                    <span className="text-sm">{ev.event_date} — {ev.title_en}</span>
                    <button onClick={() => remove(ev)} className="text-xs underline">{t("Устгах", "Delete", "削除", "删除")}</button>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
