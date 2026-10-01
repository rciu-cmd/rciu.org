"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { asset } from "@/lib/asset";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/language-context";
import { IMPACT_KEY, IMPACT_MAX, parseImpact, type ImpactStat } from "@/lib/impact";

const PRESET_BANNERS = [
  "/theme/create-lasting-impact-blue-wide.png",
  "/theme/create-lasting-impact-blue-square.png",
  "/theme/create-lasting-impact-pink-wide.png",
];

export default function AdminSettingsPage() {
  const { t } = useLanguage();
  const [bannerUrl, setBannerUrl] = useState("");
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Contact phone — shown on the public Contact page and the Footer.
  // Was hardcoded in both places until now; both read this same
  // site_settings row live, so changing it here updates the whole site
  // with no code change or redeploy needed. (contact_phone already
  // existed as a seeded row from an earlier migration — this Settings
  // page is what finally makes it actually editable.)
  const [phone, setPhone] = useState("");
  const [phoneBusy, setPhoneBusy] = useState(false);
  const [phoneSaved, setPhoneSaved] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  // "Our impact" numbers on the home page (src/lib/impact.ts). Always
  // IMPACT_MAX rows here; empty ones are dropped when saving.
  const [impact, setImpact] = useState<ImpactStat[]>([]);
  const [impactBusy, setImpactBusy] = useState(false);
  const [impactSaved, setImpactSaved] = useState(false);
  const [impactError, setImpactError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("site_settings")
      .select("key, value_en")
      .in("key", ["rotary_theme_banner_url", "contact_phone", IMPACT_KEY])
      .then(({ data }) => {
        const row = (key: string) => data?.find((r) => r.key === key)?.value_en;
        setBannerUrl(row("rotary_theme_banner_url") ?? PRESET_BANNERS[2]);
        setPhone(row("contact_phone") ?? "");
        const saved = parseImpact(row(IMPACT_KEY));
        setImpact(Array.from({ length: IMPACT_MAX }, (_, i) => saved[i] ?? { value: "", label_mn: "", label_en: "" }));
        setLoaded(true);
      });
  }, []);

  function setImpactField(i: number, field: keyof ImpactStat, value: string) {
    setImpact((rows) => rows.map((r, j) => (j === i ? { ...r, [field]: value } : r)));
    setImpactSaved(false);
  }

  async function saveImpact(e: React.FormEvent) {
    e.preventDefault();
    setImpactBusy(true);
    setImpactError(null);
    setImpactSaved(false);
    const json = JSON.stringify(parseImpact(JSON.stringify(impact)));
    const { error } = await supabase.from("site_settings").upsert({ key: IMPACT_KEY, value_en: json, value_mn: json });
    setImpactBusy(false);
    if (error) {
      setImpactError(error.message);
      return;
    }
    setImpactSaved(true);
  }

  async function save(url: string) {
    setBusy(true);
    setError(null);
    setSaved(false);
    const { error } = await supabase
      .from("site_settings")
      .upsert({ key: "rotary_theme_banner_url", value_en: url, value_mn: url });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setBannerUrl(url);
    setSaved(true);
  }

  // Uploads the picked file to the same rciu-photos bucket every other
  // admin upload uses (theme/ prefix), then saves its public URL the
  // same way the preset-banner buttons and the old URL box did.
  async function uploadBanner() {
    if (!bannerFile) return;
    setError(null);
    setSaved(false);
    setBusy(true);
    const safeName = bannerFile.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    const path = `theme/${Date.now()}-${safeName}`;
    const { error: uploadError } = await supabase.storage.from("rciu-photos").upload(path, bannerFile);
    if (uploadError) {
      setBusy(false);
      setError(uploadError.message);
      return;
    }
    const url = supabase.storage.from("rciu-photos").getPublicUrl(path).data.publicUrl;
    await save(url);
    setBannerFile(null);
  }

  async function savePhone(e: React.FormEvent) {
    e.preventDefault();
    setPhoneBusy(true);
    setPhoneError(null);
    setPhoneSaved(false);
    const { error } = await supabase
      .from("site_settings")
      .upsert({ key: "contact_phone", value_en: phone.trim(), value_mn: phone.trim() });
    setPhoneBusy(false);
    if (error) {
      setPhoneError(error.message);
      return;
    }
    setPhoneSaved(true);
  }

  const previewSrc = bannerUrl.startsWith("http") ? bannerUrl : asset(bannerUrl);

  return (
    <div>
      <h2 className="text-xl font-bold text-slate-900 mb-2">{t("Тохиргоо", "Site Settings", "サイト設定", "網站設置")}</h2>
      <p className="text-sm text-slate-500 mb-8 max-w-2xl">
        {t(
          "Кодонд хүрэлгүйгээр өөрчилж болох вебсайтын ерөнхий тохиргоонууд.",
          "Site-wide details you can change here without touching any code.",
          "コードに触れることなく変更できるサイト全体の設定です。",
          "無需修改代碼即可更改的網站整體設置。"
        )}
      </p>

      {!loaded ? (
        <p className="text-slate-400 text-sm">{t("Ачааллаж байна…", "Loading…", "読み込み中…", "加載中…")}</p>
      ) : (
        <div className="grid gap-10 max-w-2xl">
          <div>
            <h3 className="font-bold text-slate-900 mb-1">{t("Холбоо барих утасны дугаар", "Contact Phone Number", "連絡先電話番号", "聯繫電話")}</h3>
            <p className="text-sm text-slate-500 mb-3">
              {t(
                "\"Холбоо барих\" хуудас болон footer-т харагдана. Энд өөрчлөхөд кодонд хүрэлгүйгээр вебсайт даруй шинэчлэгдэнэ.",
                "Shown on the public Contact page and in the site Footer. Changing it here updates the live site immediately — no code change needed.",
                "公開のお問い合わせページとフッターに表示されます。ここで変更するとコード変更なしにサイトへ即座に反映されます。",
                "顯示在公開的聯繫頁面和頁尾。在此處更改會立即更新網站,無需修改代碼。"
              )}
            </p>
            <form onSubmit={savePhone} className="flex gap-2">
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+976 99031147"
                className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={phoneBusy}
                className="bg-rotary-royal-blue text-white font-semibold rounded-md px-4 py-2 text-sm disabled:opacity-60"
              >
                {phoneBusy ? t("Хадгалж байна…", "Saving…", "保存中…", "保存中…") : t("Хадгалах", "Save", "保存", "保存")}
              </button>
            </form>
            {phoneSaved && <p className="text-sm text-green-700 mt-2">{t("Хадгалагдлаа!", "Saved!", "保存しました!", "已保存!")}</p>}
            {phoneError && <p className="text-sm text-rotary-cardinal mt-2">{phoneError}</p>}
          </div>

          <div>
            <h3 className="font-bold text-slate-900 mb-1">{t("Бидний үр нөлөө (нүүр хуудас)", "Our Impact (home page)", "私たちの歩み(ホーム)", "我們的足跡(首頁)")}</h3>
            <p className="text-sm text-slate-500 mb-3">
              {t(
                "Нүүр хуудасны \"Бидний үр нөлөө\" хэсэгт харагдах тоонууд. Зочилсон улс, туулсан км (\"Аяллын зураг\" хэсгээс) болон үйлчилгээний жилийг сайт өөрөө тоолно — энд 3 хүртэл нэмэлт тоо оруулж болно, жишээ нь \"1,200+ · хүнд тусалсан\". Хоосон мөр харагдахгүй.",
                "Numbers shown in the home page's \"Our impact\" band. Countries visited and km traveled (from the Travel Map) and years of service are counted automatically — add up to 3 more here, e.g. \"1,200+ · people helped\". Empty rows are hidden.",
                "ホームの「私たちの歩み」に表示される数字です。訪問国数・移動距離(旅行マップから)と奉仕年数は自動で数えます。ここでは最大3つまで追加できます。空の行は表示されません。",
                "首頁「我們的足跡」中顯示的數字。造訪國家數、旅程公里數(來自旅行地圖)和服務年數會自動計算——此處可再新增最多3個。空白行不會顯示。"
              )}
            </p>
            <form onSubmit={saveImpact} className="grid gap-2">
              <div className="hidden sm:grid grid-cols-[7rem_1fr_1fr] gap-2 text-xs font-semibold text-slate-500">
                <span>{t("Тоо", "Number", "数字", "數字")}</span>
                <span>{t("Тайлбар (Монгол)", "Label (Mongolian)", "ラベル(モンゴル語)", "標籤(蒙古語)")}</span>
                <span>{t("Тайлбар (Англи)", "Label (English)", "ラベル(英語)", "標籤(英語)")}</span>
              </div>
              {impact.map((row, i) => (
                <div key={i} className="grid grid-cols-1 sm:grid-cols-[7rem_1fr_1fr] gap-2">
                  <input
                    value={row.value}
                    onChange={(e) => setImpactField(i, "value", e.target.value)}
                    placeholder={["1,200+", "15", "3,000"][i]}
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                  <input
                    value={row.label_mn}
                    onChange={(e) => setImpactField(i, "label_mn", e.target.value)}
                    placeholder={["хүнд тусалсан", "сургууль, цэцэрлэгт дэмжлэг", "сайн дурын цаг"][i]}
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                  <input
                    value={row.label_en}
                    onChange={(e) => setImpactField(i, "label_en", e.target.value)}
                    placeholder={["people helped", "schools & kindergartens supported", "volunteer hours"][i]}
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              ))}
              <div>
                <button
                  type="submit"
                  disabled={impactBusy}
                  className="bg-rotary-royal-blue text-white font-semibold rounded-md px-4 py-2 text-sm disabled:opacity-60"
                >
                  {impactBusy ? t("Хадгалж байна…", "Saving…", "保存中…", "保存中…") : t("Хадгалах", "Save", "保存", "保存")}
                </button>
              </div>
            </form>
            {impactSaved && <p className="text-sm text-green-700 mt-2">{t("Хадгалагдлаа!", "Saved!", "保存しました!", "已保存!")}</p>}
            {impactError && <p className="text-sm text-rotary-cardinal mt-2">{impactError}</p>}
          </div>

          <div>
            <h3 className="font-bold text-slate-900 mb-1">{t("Rotary сэдвийн зурагт туузыг", "Theme Banner", "テーマバナー", "主題橫幅")}</h3>
            <p className="text-sm text-slate-500 mb-4">
              {t(
                "Энэ жилийн Rotary сэдвийн зурагт туузыг удирдана — навигацийн доор давтагдаж харагдана. Дараа жилийн шинэ сэдэвтэй солиход зөвхөн доороос зургаа сонгоно.",
                "Manage this Rotary year's theme banner — the repeating strip shown right under the navbar site-wide. Next year, just pick a new image here — no code changes needed.",
                "今年のロータリーのテーマバナーを管理します — ナビの下に繰り返し表示されます。来年は下から新しい画像を選ぶだけです。",
                "管理本扶輪年度的主題橫幅——顯示在導航欄下方的重複條帶。明年只需在此選擇新圖片即可,無需修改代碼。"
              )}
            </p>
            <p className="text-sm font-semibold text-slate-700 mb-2">{t("Одоогийн туузны урьдчилан харах", "Current strip preview", "現在のプレビュー", "當前預覽")}</p>
            <div className="h-9 rounded border border-slate-200 overflow-hidden" style={{ backgroundImage: `url(${previewSrc})`, backgroundRepeat: "repeat-x", backgroundSize: "auto 100%" }} />
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-700 mb-2">{t("Бэлэн зургуудаас сонгох", "Pick from existing banners", "既存のバナーから選択", "從現有橫幅中選擇")}</p>
            <div className="grid grid-cols-3 gap-3">
              {PRESET_BANNERS.map((b) => (
                <button
                  key={b}
                  onClick={() => save(b)}
                  className={`rounded-lg border-2 p-2 ${bannerUrl === b ? "border-rotary-royal-blue" : "border-slate-200"}`}
                >
                  <Image src={asset(b)} alt="" width={200} height={80} className="w-full h-auto rounded" />
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-700 mb-2">{t("Эсвэл өөрийн зураг байршуулах", "Or upload your own image", "またはカスタム画像をアップロード", "或上傳自定義圖片")}</p>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setBannerFile(e.target.files?.[0] ?? null)}
                className="text-sm"
              />
              <button
                onClick={uploadBanner}
                disabled={busy || !bannerFile}
                className="bg-rotary-royal-blue text-white font-semibold rounded-md px-4 py-2 text-sm disabled:opacity-60"
              >
                {busy ? t("Байршуулж байна…", "Uploading…", "アップロード中…", "上傳中…") : t("Байршуулах", "Upload", "アップロード", "上傳")}
              </button>
            </div>
            {bannerFile && <p className="text-xs text-slate-400 mt-1">{bannerFile.name}</p>}
          </div>

          {saved && <p className="text-sm text-green-700">{t("Хадгалагдлаа!", "Saved!", "保存しました!", "已保存!")}</p>}
          {error && <p className="text-sm text-rotary-cardinal">{error}</p>}
        </div>
      )}
    </div>
  );
}
