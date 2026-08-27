"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { asset } from "@/lib/asset";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/language-context";

const PRESET_BANNERS = [
  "/theme/create-lasting-impact-blue-wide.png",
  "/theme/create-lasting-impact-blue-square.png",
  "/theme/create-lasting-impact-pink-wide.png",
];

export default function AdminSettingsPage() {
  const { t } = useLanguage();
  const [bannerUrl, setBannerUrl] = useState("");
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

  useEffect(() => {
    supabase
      .from("site_settings")
      .select("key, value_en")
      .in("key", ["rotary_theme_banner_url", "contact_phone"])
      .then(({ data }) => {
        const row = (key: string) => data?.find((r) => r.key === key)?.value_en;
        setBannerUrl(row("rotary_theme_banner_url") ?? PRESET_BANNERS[2]);
        setPhone(row("contact_phone") ?? "");
        setLoaded(true);
      });
  }, []);

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
            <p className="text-sm font-semibold text-slate-700 mb-2">{t("Эсвэл өөрийн зургийн URL оруулах", "Or paste a custom image URL", "またはカスタム画像URLを入力", "或粘貼自定義圖片URL")}</p>
            <div className="flex gap-2">
              <input
                value={bannerUrl}
                onChange={(e) => setBannerUrl(e.target.value)}
                className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              <button
                onClick={() => save(bannerUrl)}
                disabled={busy}
                className="bg-rotary-royal-blue text-white font-semibold rounded-md px-4 py-2 text-sm disabled:opacity-60"
              >
                {busy ? t("Хадгалж байна…", "Saving…", "保存中…", "保存中…") : t("Хадгалах", "Save", "保存", "保存")}
              </button>
            </div>
          </div>

          {saved && <p className="text-sm text-green-700">{t("Хадгалагдлаа!", "Saved!", "保存しました!", "已保存!")}</p>}
          {error && <p className="text-sm text-rotary-cardinal">{error}</p>}
        </div>
      )}
    </div>
  );
}
