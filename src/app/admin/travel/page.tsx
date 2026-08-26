"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useLanguage, Lang } from "@/lib/language-context";
import { WORLD_CITIES } from "@/data/world-cities";

type MemberOption = { id: string; first_name: string; last_name: string };

type TravelRow = {
  id: string;
  event_name: string;
  destination_city: string;
  destination_country: string;
  latitude: number;
  longitude: number;
  event_date: string | null;
  notes: string | null;
};

type TravelWithMembers = TravelRow & { memberNames: string[] };

const EMPTY = {
  member_ids: [] as string[],
  event_name: "",
  country: "",
  city: "",
  event_date: "",
  notes: "",
  manualEntry: false,
  manualCity: "",
  manualLat: "",
  manualLng: "",
};

// Intl.DisplayNames' locale tags for the site's 4 languages.
const INTL_LOCALE: Record<Lang, string> = { mn: "mn", en: "en", ja: "ja", zh: "zh" };

export default function AdminTravelPage() {
  const { t, lang } = useLanguage();
  const [items, setItems] = useState<TravelWithMembers[] | null>(null);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function refresh() {
    const { data, error } = await supabase
      .from("member_travels")
      .select("id, event_name, destination_city, destination_country, latitude, longitude, event_date, notes, member_travel_participants(members(first_name, last_name))")
      .order("event_date", { ascending: false });
    if (error) {
      setError(error.message);
      return;
    }
    type ParticipantRow = { members: { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null };
    type Row = TravelRow & { member_travel_participants: ParticipantRow[] | null };
    const rows = ((data as unknown as Row[]) ?? []).map((r) => {
      const memberNames = (r.member_travel_participants ?? []).flatMap((p) => {
        const m = Array.isArray(p.members) ? p.members[0] : p.members;
        return m ? [`${m.first_name} ${m.last_name}`] : [];
      });
      return {
        id: r.id,
        event_name: r.event_name,
        destination_city: r.destination_city,
        destination_country: r.destination_country,
        latitude: r.latitude,
        longitude: r.longitude,
        event_date: r.event_date,
        notes: r.notes,
        memberNames,
      };
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

    if (!form.country) {
      setBusy(false);
      setError(t("Улсаа сонгоно уу.", "Please select a country.", "国を選択してください。", "请选择国家。"));
      return;
    }

    let cityName: string;
    let lat: number;
    let lng: number;

    if (form.manualEntry) {
      const parsedLat = parseFloat(form.manualLat);
      const parsedLng = parseFloat(form.manualLng);
      if (!form.manualCity.trim() || Number.isNaN(parsedLat) || parsedLat < -90 || parsedLat > 90 || Number.isNaN(parsedLng) || parsedLng < -180 || parsedLng > 180) {
        setBusy(false);
        setError(t("Хотын нэр болон байршил дутуу эсвэл буруу байна.", "City name and/or coordinates are missing or invalid.", "都市名または座標が未入力か無効です。", "城市名称或坐标缺失或无效。"));
        return;
      }
      cityName = form.manualCity.trim();
      lat = parsedLat;
      lng = parsedLng;
    } else {
      // Strip a disambiguating "(region code)" suffix, if present, before storing.
      const cityEntry = citiesForCountry.find((c) => c[0] === form.city);
      if (!cityEntry) {
        setBusy(false);
        setError(t("Жагсаалтаас хот сонгоно уу (эсвэл \"Жагсаалтад алга\" гэснийг сонгоод гараар оруулна уу).", "Please pick a city from the suggestions (or check \"Not in the list\" to enter it manually).", "候補から都市を選択してください(候補にない場合は「リストにない」を選択して手動入力してください)。", "请从建议列表中选择城市(如果没有,请勾选「列表中没有」手动输入)。"));
        return;
      }
      cityName = cityEntry[0].replace(/\s*\([^)]*\)\s*$/, "");
      lat = cityEntry[2];
      lng = cityEntry[3];
    }

    const { data: inserted, error } = await supabase
      .from("member_travels")
      .insert({
        event_name: form.event_name,
        destination_city: cityName,
        destination_country: englishCountryName,
        latitude: lat,
        longitude: lng,
        event_date: form.event_date || null,
        notes: form.notes || null,
      })
      .select("id")
      .single();
    if (error || !inserted) {
      setBusy(false);
      setError(error?.message ?? t("Хадгалахад алдаа гарлаа.", "Couldn't save the trip.", "保存できませんでした。", "保存失败。"));
      return;
    }

    if (form.member_ids.length > 0) {
      const { error: participantsError } = await supabase
        .from("member_travel_participants")
        .insert(form.member_ids.map((member_id) => ({ travel_id: inserted.id, member_id })));
      if (participantsError) {
        setBusy(false);
        setError(participantsError.message);
        return;
      }
    }

    setBusy(false);
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
          "Энд нэмсэн аялал \"Бидний тухай\" хуудасны дэлхийн газрын зурган дээр харагдана. Зөвхөн олон улсын Ротари арга хэмжээнд оролцсон аялал нэмнэ (конвенц, дүүргийн бага хурал, эгч дүү клубын айлчлал гэх мэт). Улсаа сонгоод хотын нэрийг бичиж эхлэхэд санал болгосон жагсаалтаас сонгоно уу — байршил автоматаар тохируулагдана. Хот жагсаалтад байхгүй бол доор \"гараар оруулах\"-ыг сонгож болно.",
          "Trips added here appear on the world map on the About page. Only add trips for official international Rotary events (convention, district conference abroad, sister-club visit, etc.). Select the country, then start typing the city name and pick from the suggestions — the map location is set automatically. If a city isn't in the list, check \"enter manually\" below.",
          "ここに追加した旅行は「私たちについて」ページの世界地図に表示されます。公式の国際ロータリー行事(大会、海外地区大会、姉妹クラブ訪問など)のみ追加してください。国を選択後、都市名を入力して候補から選ぶと位置が自動的に設定されます。リストにない場合は下の「手動入力」を選択してください。",
          "在此添加的行程将显示在「关于我们」页面的世界地图上。仅添加正式的国际扶轮活动(年会、境外分区年会、姊妹俱乐部互访等)。选择国家后输入城市名称并从建议列表中选择,地图位置将自动设定。如果列表中没有该城市,请勾选下方的「手动输入」。"
        )}
      </p>

      {showForm && (
        <form onSubmit={createTravel} className="rounded-xl border border-slate-200 p-6 mb-8 grid gap-3">
          <input required placeholder={t("Арга хэмжээний нэр", "Event name", "イベント名", "活动名称")} value={form.event_name} onChange={(e) => setForm({ ...form, event_name: e.target.value })} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />

          <div>
            <p className="text-xs font-semibold text-slate-600 mb-1">
              {t("Оролцсон гишүүд (заавал биш, олноор сонгож болно)", "Members who went (optional, pick as many as went)", "参加した会員(任意、複数選択可)", "参加的会员(可选,可多选)")}
            </p>
            <div className="rounded-md border border-slate-300 max-h-40 overflow-y-auto p-2 grid sm:grid-cols-2 gap-x-4">
              {members.map((m) => {
                const checked = form.member_ids.includes(m.id);
                return (
                  <label key={m.id} className="flex items-center gap-2 text-sm py-0.5">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          member_ids: e.target.checked
                            ? [...form.member_ids, m.id]
                            : form.member_ids.filter((id) => id !== m.id),
                        })
                      }
                    />
                    {m.first_name} {m.last_name}
                  </label>
                );
              })}
            </div>
            {form.member_ids.length > 0 && (
              <p className="text-xs text-slate-500 mt-1">
                {t(`${form.member_ids.length} гишүүн сонгосон`, `${form.member_ids.length} member${form.member_ids.length > 1 ? "s" : ""} selected`, `${form.member_ids.length}名選択済み`, `已选择 ${form.member_ids.length} 名会员`)}
              </p>
            )}
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

            {!form.manualEntry ? (
              <div>
                <input
                  required
                  list="travel-city-options"
                  placeholder={
                    form.country
                      ? t("Хот бичиж хайх…", "Type to search a city…", "都市名を入力して検索…", "输入城市名称搜索…")
                      : t("Эхлээд улсаа сонгоно уу", "Select a country first", "先に国を選択してください", "请先选择国家")
                  }
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  disabled={!form.country}
                  autoComplete="off"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100 disabled:text-slate-400"
                />
                <datalist id="travel-city-options">
                  {citiesForCountry.map((c) => (
                    <option key={c[0]} value={c[0]} />
                  ))}
                </datalist>
              </div>
            ) : (
              <input
                required
                placeholder={t("Хотын нэр", "City name", "都市名", "城市名称")}
                value={form.manualCity}
                onChange={(e) => setForm({ ...form, manualCity: e.target.value })}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            )}
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-500">
            <input
              type="checkbox"
              checked={form.manualEntry}
              onChange={(e) => setForm({ ...form, manualEntry: e.target.checked, city: "", manualCity: "", manualLat: "", manualLng: "" })}
            />
            {t(
              "Хот жагсаалтад алга (гараар оруулах)",
              "City not in the list (enter manually)",
              "都市がリストにない(手動入力)",
              "列表中没有此城市(手动输入)"
            )}
          </label>

          {form.manualEntry && (
            <div className="grid gap-3 sm:grid-cols-2 rounded-md bg-slate-50 border border-slate-200 p-3">
              <input
                required
                type="number"
                step="any"
                placeholder={t("Өргөрөг (lat)", "Latitude", "緯度", "纬度")}
                value={form.manualLat}
                onChange={(e) => setForm({ ...form, manualLat: e.target.value })}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              <input
                required
                type="number"
                step="any"
                placeholder={t("Уртраг (lng)", "Longitude", "経度", "经度")}
                value={form.manualLng}
                onChange={(e) => setForm({ ...form, manualLng: e.target.value })}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              <p className="text-xs text-slate-400 sm:col-span-2">
                {t(
                  "Google Maps дээр газрыг хайгаад баруун товч дараад олж болно.",
                  "Find these by searching the place on Google Maps and right-clicking it.",
                  "Googleマップでその場所を検索し右クリックすると調べられます。",
                  "可在谷歌地图中搜索该地点并右键点击以获取。"
                )}
              </p>
            </div>
          )}

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
                {it.memberNames.length > 0 && <p className="text-sm text-slate-500">{it.memberNames.join(", ")}</p>}
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
