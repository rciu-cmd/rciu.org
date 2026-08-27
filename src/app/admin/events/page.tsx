"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/language-context";

type Category = "installation_ceremony" | "district_events" | "projects" | "other" | "public_holiday";

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
  cover_image_url: string | null;
  registration_url: string | null;
};

const CATEGORY_LABELS: Record<Category, { mn: string; en: string }> = {
  installation_ceremony: { mn: "Албан ёсны ёслол", en: "Installation Ceremony" },
  district_events: { mn: "Дүүргийн арга хэмжээ", en: "District Event" },
  projects: { mn: "Төслийн арга хэмжээ", en: "Project Event" },
  other: { mn: "Бусад", en: "Other" },
  public_holiday: { mn: "Улсын баяр", en: "Public Holiday" },
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
  registration_url: "",
};

export default function AdminEventsPage() {
  const { t } = useLanguage();
  const [items, setItems] = useState<EventRow[] | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  // The event being edited keeps its existing cover photo unless the
  // admin picks a new file — this holds that existing URL so we know
  // what to fall back to.
  const [existingCoverUrl, setExistingCoverUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [reminderStatus, setReminderStatus] = useState<Record<string, string>>({});

  async function refresh() {
    const { data, error } = await supabase.from("events").select("*").order("event_date", { ascending: true });
    if (error) setError(error.message);
    else setItems(data as EventRow[]);
  }

  useEffect(() => {
    refresh();
  }, []);

  function startEdit(item: EventRow) {
    setEditingId(item.id);
    setForm({
      title_mn: item.title_mn,
      title_en: item.title_en,
      description_mn: item.description_mn ?? "",
      description_en: item.description_en ?? "",
      location: item.location ?? "",
      event_date: item.event_date,
      event_time: item.event_time ?? "",
      category: item.category ?? "other",
      registration_url: item.registration_url ?? "",
    });
    setExistingCoverUrl(item.cover_image_url);
    setFile(null);
    setError(null);
    setShowForm(true);
  }

  function cancelForm() {
    setEditingId(null);
    setForm(EMPTY);
    setExistingCoverUrl(null);
    setFile(null);
    setShowForm(false);
  }

  async function saveEvent(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    // Keep the existing cover unless a new file was picked.
    let coverImageUrl: string | null = existingCoverUrl;
    if (file) {
      const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
      const path = `events/${form.event_date}-${Date.now()}-${safeName}`;
      const { error: uploadError } = await supabase.storage.from("rciu-photos").upload(path, file);
      if (uploadError) {
        setBusy(false);
        setError(uploadError.message);
        return;
      }
      coverImageUrl = supabase.storage.from("rciu-photos").getPublicUrl(path).data.publicUrl;
    }

    const payload = {
      title_mn: form.title_mn,
      title_en: form.title_en,
      description_mn: form.description_mn || null,
      description_en: form.description_en || null,
      location: form.location || null,
      event_date: form.event_date,
      event_time: form.event_time || null,
      category: form.category,
      cover_image_url: coverImageUrl,
      registration_url: form.registration_url.trim() || null,
    };

    const { error } = editingId
      ? await supabase.from("events").update(payload).eq("id", editingId)
      : await supabase.from("events").insert(payload);
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    cancelForm();
    refresh();
  }

  async function remove(item: EventRow) {
    if (!confirm(t("Устгах уу?", "Delete this event?", "削除しますか?", "確定刪除嗎?"))) return;
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
        <h2 className="text-xl font-bold text-slate-900">{t("Хуанли удирдах", "Manage Calendar", "カレンダー管理", "日曆管理")}</h2>
        <button onClick={() => (showForm ? cancelForm() : setShowForm(true))} className="text-sm font-semibold bg-rotary-royal-blue text-white rounded-md px-4 py-2">
          {showForm ? t("Хаах", "Cancel", "キャンセル", "取消") : t("+ Шинэ үйл явдал", "+ New Event", "+ 新規イベント", "+ 新建活動")}
        </button>
      </div>

      <p className="text-sm text-slate-500 mb-6 max-w-2xl">
        {t(
          "Энд нэмсэн арга хэмжээ нийтийн \"Арга хэмжээ\" хуудсанд (навигацид) харагдана — нэвтрэх шаардлагагүй. Сануулга и-мэйл автоматаар биш, доорх товчоор гараар илгээгдэнэ.",
          "Events added here show on the public Events page (in the nav bar) — no login needed. Reminder emails are not automatic — send them manually with the button below, whenever you'd like.",
          "ここで追加したイベントは公開の「イベント」ページ(ナビゲーションバー)に表示されます — ログイン不要です。リマインダーメールは自動送信されません。下のボタンで手動で送信してください。",
          "在此新增的活動會顯示在公開的「活動」頁面(導覽列)——無需登入。提醒郵件不會自動發送——請使用下方按鈕手動發送。"
        )}
      </p>

      {showForm && (
        <form onSubmit={saveEvent} className="rounded-xl border border-slate-200 p-6 mb-8 grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <input required placeholder={t("Гарчиг (MN)", "Title (MN)", "タイトル(MN)", "標題(MN)")} value={form.title_mn} onChange={(e) => setForm({ ...form, title_mn: e.target.value })} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
            <input required placeholder={t("Гарчиг (EN)", "Title (EN)", "タイトル(EN)", "標題(EN)")} value={form.title_en} onChange={(e) => setForm({ ...form, title_en: e.target.value })} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <input required type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
            <input placeholder={t("Цаг (заавал биш)", "Time (optional)", "時間(任意)", "時間(可選)")} value={form.event_time} onChange={(e) => setForm({ ...form, event_time: e.target.value })} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as Category })} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
              {(Object.keys(CATEGORY_LABELS) as Category[]).map((c) => (
                <option key={c} value={c}>{t(CATEGORY_LABELS[c].mn, CATEGORY_LABELS[c].en)}</option>
              ))}
            </select>
          </div>
          <input placeholder={t("Байршил", "Location", "場所", "地點")} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <div>
            <input
              type="url"
              placeholder={t("Бүртгүүлэх холбоос (заавал биш)", "Registration URL (optional)", "登録リンク(任意)", "報名連結(可選)")}
              value={form.registration_url}
              onChange={(e) => setForm({ ...form, registration_url: e.target.value })}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm w-full"
            />
            <p className="text-xs text-slate-400 mt-1">
              {t(
                "Google Form, Eventbrite гэх мэт. Оруулбал нийтийн хуудсанд шинэ цонхонд нээгдэх \"Бүртгүүлэх\" товч гарч ирнэ.",
                "e.g. a Google Form or Eventbrite link. If set, a \"Register\" button appears on the public page and opens it in a new tab.",
                "Googleフォームなど。設定すると公開ページに新しいタブで開く「登録」ボタンが表示されます。",
                "例如 Google 表單或 Eventbrite 連結。設定後，公開頁面會顯示「報名」按鈕，並在新分頁開啟。"
              )}
            </p>
          </div>
          <textarea placeholder={t("Тайлбар (MN)", "Description (MN)", "説明(MN)", "描述(MN)")} value={form.description_mn} onChange={(e) => setForm({ ...form, description_mn: e.target.value })} rows={2} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <textarea placeholder={t("Тайлбар (EN)", "Description (EN)", "説明(EN)", "描述(EN)")} value={form.description_en} onChange={(e) => setForm({ ...form, description_en: e.target.value })} rows={2} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-1">{t("Зураг (заавал биш)", "Photo (optional)", "写真(任意)", "照片(可選)")}</p>
            <p className="text-xs text-slate-400 mb-2">
              {t(
                "Сарын календарийн энэ сарын арга хэмжээний жагсаалтад зурагтай харагдана. Дэвшилтэт харагдацын тулд tablet өргөнтэй (4:3 харьцаатай) зураг санал болгож байна.",
                "Shown next to the event in the month's event list on the public Events page. For the best fit, use a tablet-width photo (4:3 ratio).",
                "公開のイベントページの今月のイベント一覧に表示されます。タブレット幅(4:3)の写真を推奨します。",
                "會顯示在公開活動頁面「本月活動」列表中該活動旁。建議使用平板寬度(4:3 比例)的照片以獲得最佳效果。"
              )}
            </p>
            {editingId && existingCoverUrl && !file && (
              <div className="mb-2 flex items-center gap-3">
                <Image src={existingCoverUrl} alt="" width={96} height={72} className="rounded-md object-cover w-24 h-[4.5rem]" />
                <span className="text-xs text-slate-400">{t("Одоогийн зураг — сольхын тулд доор шинэ файл сонгоно уу", "Current photo — pick a new file below to replace it", "現在の写真 — 変更する場合は下でファイルを選択", "目前的照片 — 如需更換請在下方選擇新檔案")}</span>
              </div>
            )}
            <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-sm" />
          </div>
          {error && <p className="text-sm text-rotary-cardinal">{error}</p>}
          <button type="submit" disabled={busy} className="justify-self-start bg-rotary-royal-blue text-white font-semibold rounded-md px-5 py-2 text-sm disabled:opacity-60">
            {busy ? t("Хадгалж байна…", "Saving…", "保存中…", "保存中…") : editingId ? t("Шинэчлэх", "Update Event", "更新", "更新") : t("Хадгалах", "Save Event", "保存", "保存")}
          </button>
        </form>
      )}

      {items === null && <p className="text-slate-400 text-sm">{t("Ачааллаж байна…", "Loading…", "読み込み中…", "加載中…")}</p>}

      {items && (
        <>
          <h3 className="font-semibold text-slate-700 mb-3">{t("Удахгүй болох", "Upcoming", "今後の予定", "即將舉行")}</h3>
          <div className="grid gap-3 mb-10">
            {upcoming.length === 0 && <p className="text-slate-400 text-sm">{t("Төлөвлөсөн үйл явдал алга.", "No upcoming events.", "予定されているイベントはありません。", "暫無即將舉行的活動。")}</p>}
            {upcoming.map((ev) => (
              <div key={ev.id} className="rounded-xl border border-slate-200 p-5 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  {ev.cover_image_url && (
                    <Image src={ev.cover_image_url} alt="" width={80} height={60} className="rounded-md object-cover w-20 h-[3.75rem] shrink-0" />
                  )}
                  <div>
                    <p className="text-xs font-semibold text-rotary-azure">
                      {ev.event_date}{ev.event_time ? ` · ${ev.event_time}` : ""}
                      {ev.category && ` · ${t(CATEGORY_LABELS[ev.category].mn, CATEGORY_LABELS[ev.category].en)}`}
                    </p>
                    <p className="font-bold text-slate-900">{ev.title_en}</p>
                    {ev.location && <p className="text-sm text-slate-500">{ev.location}</p>}
                  </div>
                </div>
                <div className="flex flex-col gap-2 items-end shrink-0">
                  <button
                    onClick={() => sendReminder(ev)}
                    disabled={reminderStatus[ev.id] === "sending"}
                    className="text-xs font-semibold px-3 py-1.5 rounded-md bg-rotary-gold text-[#5a3d0a] disabled:opacity-60"
                  >
                    {reminderStatus[ev.id] === "sending"
                      ? t("Илгээж байна…", "Sending…", "送信中…", "發送中…")
                      : t("Сануулга илгээх", "Send Reminder", "リマインダー送信", "發送提醒")}
                  </button>
                  {reminderStatus[ev.id] && reminderStatus[ev.id] !== "sending" && (
                    <p className="text-xs text-slate-500 max-w-[14rem] text-right">{reminderStatus[ev.id]}</p>
                  )}
                  <div className="flex gap-2">
                    <button onClick={() => startEdit(ev)} className="text-xs font-semibold px-3 py-1.5 rounded-md border border-rotary-royal-blue text-rotary-royal-blue hover:bg-rotary-royal-blue hover:text-white">
                      {t("Засах", "Edit", "編集", "編輯")}
                    </button>
                    <button onClick={() => remove(ev)} className="text-xs font-semibold px-3 py-1.5 rounded-md border border-rotary-cardinal text-rotary-cardinal hover:bg-rotary-cardinal hover:text-white">
                      {t("Устгах", "Delete", "削除", "刪除")}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {past.length > 0 && (
            <>
              <h3 className="font-semibold text-slate-400 mb-3">{t("Өнгөрсөн", "Past", "過去", "過去")}</h3>
              <div className="grid gap-2">
                {past.map((ev) => (
                  <div key={ev.id} className="rounded-lg border border-slate-100 p-3 flex items-center justify-between text-slate-400">
                    <span className="text-sm">{ev.event_date} — {ev.title_en}</span>
                    <span className="flex gap-3">
                      <button onClick={() => startEdit(ev)} className="text-xs underline">{t("Засах", "Edit", "編集", "編輯")}</button>
                      <button onClick={() => remove(ev)} className="text-xs underline">{t("Устгах", "Delete", "削除", "刪除")}</button>
                    </span>
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
