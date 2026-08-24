"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/language-context";

type PresidentRow = {
  id: string;
  name: string;
  year_range: string;
  sort_order: number;
};

const EMPTY_PRESIDENT = { name: "", year_range: "", sort_order: "0" };

export default function AdminHistoryPage() {
  const { t } = useLanguage();

  // -- club history text (site_settings) --------------------------
  const [historyMn, setHistoryMn] = useState("");
  const [historyEn, setHistoryEn] = useState("");
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [historyBusy, setHistoryBusy] = useState(false);
  const [historySaved, setHistorySaved] = useState(false);

  // -- past presidents (club_past_presidents) ----------------------
  const [presidents, setPresidents] = useState<PresidentRow[] | null>(null);
  const [form, setForm] = useState(EMPTY_PRESIDENT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    refreshPresidents();
  }, []);

  // Club history is stored as a single site_settings row keyed
  // 'club_history_mn', with the MN/EN text split across the existing
  // value_mn/value_en columns.
  useEffect(() => {
    supabase
      .from("site_settings")
      .select("key, value_mn, value_en")
      .eq("key", "club_history_mn")
      .maybeSingle()
      .then(({ data }) => {
        setHistoryMn(data?.value_mn ?? "");
        setHistoryEn(data?.value_en ?? "");
        setHistoryLoaded(true);
      });
  }, []);

  async function saveHistory() {
    setHistoryBusy(true);
    setHistorySaved(false);
    const { error } = await supabase
      .from("site_settings")
      .upsert({ key: "club_history_mn", value_mn: historyMn, value_en: historyEn });
    setHistoryBusy(false);
    if (!error) setHistorySaved(true);
  }

  async function refreshPresidents() {
    const { data, error } = await supabase.from("club_past_presidents").select("*").order("sort_order");
    if (error) setError(error.message);
    else setPresidents(data as PresidentRow[]);
  }

  function startEdit(p: PresidentRow) {
    setEditingId(p.id);
    setForm({ name: p.name, year_range: p.year_range, sort_order: String(p.sort_order) });
    setShowForm(true);
  }

  async function submitPresident(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const payload = {
      name: form.name,
      year_range: form.year_range,
      sort_order: Number(form.sort_order) || 0,
    };
    const { error } = editingId
      ? await supabase.from("club_past_presidents").update(payload).eq("id", editingId)
      : await supabase.from("club_past_presidents").insert(payload);
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setForm(EMPTY_PRESIDENT);
    setEditingId(null);
    setShowForm(false);
    refreshPresidents();
  }

  async function removePresident(p: PresidentRow) {
    if (!confirm(t("Устгах уу?", "Delete this entry?", "削除しますか?", "确定删除吗?"))) return;
    await supabase.from("club_past_presidents").delete().eq("id", p.id);
    refreshPresidents();
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-slate-900 mb-2">{t("Түүх", "Club History", "クラブの歴史", "俱乐部历史")}</h2>
      <p className="text-sm text-slate-500 mb-8 max-w-2xl">
        {t(
          "Клубын түүх, урьд өмнөх тэргүүнүүдийн жагсаалт — About хуудсанд харагдана.",
          "Your club's founding story and past-presidents list — shown on the About page.",
          "クラブの歴史と歴代会長リスト — Aboutページに表示されます。",
          "俱乐部历史与历任社长名单 — 显示在关于页面。"
        )}
      </p>

      {/* Club history text */}
      <div className="rounded-xl border border-slate-200 p-6 mb-10 grid gap-3 max-w-2xl">
        <h3 className="font-semibold text-slate-700">{t("Түүхийн текст", "History Text", "歴史のテキスト", "历史文字")}</h3>
        {!historyLoaded ? (
          <p className="text-slate-400 text-sm">{t("Ачааллаж байна…", "Loading…", "読み込み中…", "加载中…")}</p>
        ) : (
          <>
            <textarea
              placeholder={t("Түүх (MN)", "History (MN)", "歴史(MN)", "历史(MN)")}
              value={historyMn}
              onChange={(e) => setHistoryMn(e.target.value)}
              rows={4}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <textarea
              placeholder={t("Түүх (EN)", "History (EN)", "歴史(EN)", "历史(EN)")}
              value={historyEn}
              onChange={(e) => setHistoryEn(e.target.value)}
              rows={4}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              onClick={saveHistory}
              disabled={historyBusy}
              className="justify-self-start bg-rotary-royal-blue text-white font-semibold rounded-md px-5 py-2 text-sm disabled:opacity-60"
            >
              {historyBusy ? t("Хадгалж байна…", "Saving…", "保存中…", "保存中…") : t("Хадгалах", "Save", "保存", "保存")}
            </button>
            {historySaved && <p className="text-sm text-green-700">{t("Хадгалагдлаа!", "Saved!", "保存しました!", "已保存!")}</p>}
          </>
        )}
      </div>

      {/* Past presidents */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold text-slate-700">{t("Урьд өмнөх тэргүүнүүд", "Past Presidents", "歴代会長", "历任社长")}</h3>
        <button
          onClick={() => {
            setEditingId(null);
            setForm(EMPTY_PRESIDENT);
            setShowForm((v) => !v);
          }}
          className="text-sm font-semibold bg-rotary-royal-blue text-white rounded-md px-4 py-2"
        >
          {showForm ? t("Хаах", "Cancel", "キャンセル", "取消") : t("+ Нэмэх", "+ Add", "+ 追加", "+ 添加")}
        </button>
      </div>

      {showForm && (
        <form onSubmit={submitPresident} className="rounded-xl border border-slate-200 p-6 mb-8 grid gap-3 sm:grid-cols-3">
          <input required placeholder={t("Нэр", "Name", "氏名", "姓名")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input required placeholder={t("Жил (жишээ: 2020-2021)", "Year(s) (e.g. 2020-2021)", "年度(例:2020-2021)", "年度(例:2020-2021)")} value={form.year_range} onChange={(e) => setForm({ ...form, year_range: e.target.value })} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input type="number" placeholder={t("Эрэмбэ", "Sort order", "並び順", "排序")} value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          {error && <p className="text-sm text-rotary-cardinal sm:col-span-3">{error}</p>}
          <button type="submit" disabled={busy} className="justify-self-start bg-rotary-royal-blue text-white font-semibold rounded-md px-5 py-2 text-sm disabled:opacity-60 sm:col-span-3">
            {busy ? t("Хадгалж байна…", "Saving…", "保存中…", "保存中…") : editingId ? t("Шинэчлэх", "Update", "更新", "更新") : t("Хадгалах", "Save", "保存", "保存")}
          </button>
        </form>
      )}

      {presidents === null && <p className="text-slate-400 text-sm">{t("Ачааллаж байна…", "Loading…", "読み込み中…", "加载中…")}</p>}
      {presidents && presidents.length === 0 && <p className="text-slate-400 text-sm">{t("Жагсаалт хоосон байна.", "No past presidents added yet.", "まだ登録されていません。", "暂无记录。")}</p>}

      <div className="grid gap-2 max-w-2xl">
        {presidents?.map((p) => (
          <div key={p.id} className="rounded-lg border border-slate-200 p-3 flex items-center justify-between">
            <div>
              <span className="font-semibold text-slate-900">{p.name}</span>
              <span className="text-sm text-slate-500 ml-2">{p.year_range}</span>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => startEdit(p)} className="text-xs font-semibold px-3 py-1.5 rounded-md border border-rotary-royal-blue text-rotary-royal-blue hover:bg-rotary-royal-blue hover:text-white">
                {t("Засах", "Edit", "編集", "编辑")}
              </button>
              <button onClick={() => removePresident(p)} className="text-xs font-semibold px-3 py-1.5 rounded-md border border-rotary-cardinal text-rotary-cardinal hover:bg-rotary-cardinal hover:text-white">
                {t("Устгах", "Delete", "削除", "删除")}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
