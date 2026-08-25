"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useLanguage, Lang } from "@/lib/language-context";
import { WORLD_CITIES } from "@/data/world-cities";

type MemberOption = { id: string; first_name: string; last_name: string };

type TravelRow = {
  id: string;
  member_id: string | null;
  event_name: string;
  destination_city: string;
  destination_country: string;
  latitude: number;
  longitude: number;
  event_date: string | null;
  notes: string | null;
};

type TravelWithMember = TravelRow & { memberName: string | null };

const EMPTY = {
  member_id: "",
  event_name: "",
  country: "",
  city: "",
  event_date: "",
  notes: "",
};

// Intl.DisplayNames' locale tags for the site's 4 languages.
const INTL_LOCALE: Record<Lang, string> = { mn: "mn", en: "en", ja: "ja", zh: "zh" };

export default function AdminTravelPage() {
  const { t, lang } = useLanguage();
  const [items, setItems] = useState<TravelWithMember[] | null>(null);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function refresh() {
    const { data, error } = await supabase
      .from("member_travels")
      .select("id, member_id, event_name, destination_city, destination_country, latitude, longitude, event_date, notes, members(first_name, last_name)")
      .order("event_date", { ascending: false });
    if (error) {
      setError(error.message);
      return;
    }
    type Row = TravelRow & { members: { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null };
    const rows = ((data as unknown as Row[]) ?? []).map((r) => {
      const m = Array.isArray(r.members) ? r.members[0] : r.members;
      return { ...r, memberName: m ? `${m.first_name} ${m.last_name}` : null };
    });
    setItems(rows);
  }

  useEffect(() => {
    refresh();
    supabase
      .from("members")
      .select("id, first_name, last_name")
      .eq("status", "active")
      .order("last_name", { ascending: true })
      .then(({ data }) => setMembers((data as MemberOption[]) ?? []));
  }, []);

  // Country dropdown — every ISO code present in the bundled city list,
  // labelled in whatever language the admin is currently viewing in
  // (falls back to the raw code if Intl.DisplayNames isn't available).
  const countries = useMemo(() => {
    const codes = Array.from(new Set(WORLD_CITIES.map((c) => c[1])));
    let displayNames: Intl.DisplayNames | null = null;
    try {
      displayNames = new Intl.DisplayNames([INTL_LOCALE[lang]], { type: "region" });
    } catch {
      displayNames = null;
    }
    return codes
      .map((code) => ({ code, label: displayNames?.of(code) ?? code }))
      .sort((a, b) => a.label.localeCompare(b.label, lang));
  }, [lang]);

  // City dropdown — cities in the selected country only.
  const citiesForCountry = useMemo(
    () => WORLD_CITIES.filter((c) => c[1] === form.country),
    [form.country]
  );

  // English country name is what actually gets stored, so the public
  // map/list shows one consistent name regardless of which language an
  // admin happened to be using when they added the trip.
  const englishCountryName = useMemo(() => {
    if (!form.country) return "";
    try {
      return new Intl.DisplayNames(["en"], { type: "region" }).of(form.country) ?? form.country;
    } catch {
      return form.country;
    }
  }, [form.country]);

  async function createTravel(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const cityEntry = citiesForCountry.find((c) => c[0] === form.city);
    if (!form.country || !cityEntry) {
      setBusy(false);
      setError(t("Улс, хотоо сонгоно уу.", "Please select a country and city.", "国と都市を選択してください。", "请选择国家和城市。"));
      return;
    }
    const [cityLabel, , lat, lng] = cityEntry;
    // Strip a disambiguating "(region code)" suffix, if present, before storing.
    const cityName = cityLabel.replace(/\s*\([^)]*\)\s*$/, "");

    const { error } = await supabase.from("member_travels").insert({
      member_id: form.member_id || null,
      event_name: form.event_name,
      destination_city: cityName,
      destination_country: englishCountryName,
      latitude: lat,
      longitude: lng,
      event_date: form.event_date || null,
      notes: form.notes || null,
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

  async function remove(item: TravelRow) {
    if (!confirm(t("Устгах уу?", "Delete this trip?", "削除しますか?", "确定删除吗?"))) return;
    await supabase.from("member_travels").delete().eq("id", item.id);
    refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-900">
          {t("Аяллын газрын зураг удирдах", "Manage Travel Map", "旅行マップ管理", "旅行地图管理")}
        </h2>
        <button onClick={() => setShowForm((v) => !v)} className="text-sm font-semibold bg-rotary-royal-blue text-white rounded-md px-4 py-2">
          {showForm ? t("Хаах", "Cancel", "キャンセル", "取消") : t("+ Шинэ аялал", "+ New Trip", "+ 新規旅行", "+ 新建行程")}
        </button>
      </div>

      <p className="text-sm text-slate-500 mb-6 max-w-2xl">
        {t(
          "Энд нэмсэн аялал \"Бидний тухай\" хуудасны дэлхийн газрын зурган дээр харагдана. Зөвхөн олон улсын Ротари арга хэмжээнд оролцсон аялал нэмнэ (конвенц, дүүргийн бага хурал, эгч дүү клубын айлчлал гэх мэт). Улс, хотоо доорх жагсаалтаас сонгоход байршил автоматаар тохируулагдана.",
          "Trips added here appear on the world map on the About page. Only add trips for official international Rotary events (convention, district conference abroad, sister-club visit, etc.). Just pick the country and city below — the map location is set automatically.",
          "ここに追加した旅行は「私たちについて」ページの世界地図に表示されます。公式の国際ロータリー行事(大会、海外地区大会、姉妹クラブ訪問など)のみ追加してください。下から国と都市を選択するだけで位置が自動的に設定されます。",
          "在此添加的行程将显示在「关于我们」页面的世界地图上。仅添加正式的国际扶轮活动(年会、境外分区年会、姊妹俱乐部互访等)。只需在下方选择国家和城市，地图位置将自动设定。"
        )}
      </p>

      {showForm && (
        <form onSubmit={createTravel} className="rounded-xl border border-slate-200 p-6 mb-8 grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <select value={form.member_id} onChange={(e) => setForm({ ...form, member_id: e.target.value })} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
              <option value="">{t("Гишүүн (заавал биш)", "Member (optional)", "会員(任意)", "会员(可选)")}</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
              ))}
            </select>
            <input required placeholder={t("Арга хэмжээний нэр", "Event name", "イベント名", "活动名称")} value={form.event_name} onChange={(e) => setForm({ ...form, event_name: e.target.value })} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <select
              required
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value, city: "" })}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">{t("Улс сонгох", "Select country", "国を選択", "选择国家")}</option>
              {countries.map((c) => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
            <select
              required
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              disabled={!form.country}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100 disabled:text-slate-400"
            >
              <option value="">
                {form.country
                  ? t("Хот сонгох", "Select city", "都市を選択", "选择城市")
                  : t("Эхлээд улсаа сонгоно уу", "Select a country first", "先に国を選択してください", "请先选择国家")}
              </option>
              {citiesForCountry.map((c) => (
                <option key={c[0]} value={c[0]}>{c[0]}</option>
              ))}
            </select>
          </div>
          <input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:w-56" />
          <textarea placeholder={t("Тэмдэглэл (заавал биш)", "Notes (optional)", "メモ(任意)", "备注(可选)")} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          {error && <p className="text-sm text-rotary-cardinal">{error}</p>}
          <button type="submit" disabled={busy} className="justify-self-start bg-rotary-royal-blue text-white font-semibold rounded-md px-5 py-2 text-sm disabled:opacity-60">
            {busy ? t("Хадгалж байна…", "Saving…", "保存中…", "保存中…") : t("Хадгалах", "Save Trip", "保存", "保存")}
          </button>
        </form>
      )}

      {items === null && <p className="text-slate-400 text-sm">{t("Ачааллаж байна…", "Loading…", "読み込み中…", "加载中…")}</p>}

      {items && items.length === 0 && (
        <p className="text-slate-400 text-sm">{t("Одоогоор аялал алга.", "No trips yet.", "旅行データはまだありません。", "暂无行程数据。")}</p>
      )}

      {items && items.length > 0 && (
        <div className="grid gap-3">
          {items.map((it) => (
            <div key={it.id} className="rounded-xl border border-slate-200 p-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-rotary-azure">
                  {it.destination_city}, {it.destination_country}
                  {it.event_date && ` · ${it.event_date}`}
                </p>
                <p className="font-bold text-slate-900">{it.event_name}</p>
                {it.memberName && <p className="text-sm text-slate-500">{it.memberName}</p>}
                {it.notes && <p className="text-sm text-slate-400 mt-1">{it.notes}</p>}
              </div>
              <button onClick={() => remove(it)} className="text-xs font-semibold px-3 py-1.5 rounded-md border border-rotary-cardinal text-rotary-cardinal hover:bg-rotary-cardinal hover:text-white shrink-0">
                {t("Устгах", "Delete", "削除", "删除")}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
