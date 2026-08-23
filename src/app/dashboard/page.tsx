"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/language-context";
import { phfTheme } from "@/lib/phf";

type Member = {
  id: string;
  member_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  city: string | null;
  classification: string | null;
  position: string | null;
  bio_en: string | null;
  phf_level: string;
  phf_date: string | null;
  major_donor: boolean;
  status: string;
};

export default function DashboardPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.replace("/login/");
        return;
      }
      const { data } = await supabase.from("members").select("*").eq("id", session.user.id).single();
      setMember(data as Member);
      setLoading(false);
    });
  }, [router]);

  if (loading) {
    return <div className="container-page py-20 text-center text-slate-400">{t("Ачааллаж байна…", "Loading…", "読み込み中…", "加载中…")}</div>;
  }

  if (!member) {
    return <div className="container-page py-20 text-center text-slate-500">{t("Профайл олдсонгүй.", "Profile not found.", "プロフィールが見つかりません。", "未找到个人资料。")}</div>;
  }

  const theme = phfTheme(member.phf_level);
  const isPhf = member.phf_level !== "none";

  return (
    <div>
      {/* Header changes color/gradient by PHF tier — sapphire for +1..+5, ruby for +6..+8, gold for base PHF */}
      <section className="text-white" style={{ background: theme.gradient }}>
        <div className="container-page py-14">
          <p className="text-sm font-semibold uppercase tracking-wide text-white/70 mb-2">
            {t("Хувийн профайл", "Member Dashboard", "会員ダッシュボード", "会员仪表盘")}
          </p>
          <h1 className="text-3xl font-bold mb-2">{member.first_name} {member.last_name}</h1>
          {isPhf ? (
            <div className="inline-flex items-center gap-2 bg-white/15 rounded-full px-4 py-1.5 text-sm font-semibold">
              {theme.gem !== "none" && (
                <span>{"💎".repeat(theme.gemCount)}</span>
              )}
              {theme.label}
              {member.major_donor && <span className="text-rotary-gold">★ {t("Их хандивлагч", "Major Donor", "メジャードナー", "重要捐赠人")}</span>}
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 bg-white/15 rounded-full px-4 py-1.5 text-sm">
              {t(
                "Та одоогоор Paul Harris Fellow биш байна",
                "You're not a Paul Harris Fellow yet",
                "まだポール・ハリス・フェローではありません",
                "您尚未成为保罗·哈里斯会员"
              )}
            </div>
          )}
        </div>
      </section>

      {!isPhf && (
        <div className="bg-amber-50 border-b border-amber-200">
          <div className="container-page py-4 text-amber-800 text-sm">
            {t(
              "The Rotary Foundation-д $1,000 хандив өргөснөөр Paul Harris Fellow болох боломжтой. Дэлгэрэнгүйг клубын хандивын зохицуулагчаас асууна уу.",
              "Contributing $1,000 to The Rotary Foundation makes you a Paul Harris Fellow. Ask your club's Foundation chair for details.",
              "ロータリー財団に$1,000寄付すると、ポール・ハリス・フェローになれます。詳細はクラブの財団委員長にお尋ねください。",
              "向扶轮基金会捐款 $1,000 即可成为保罗·哈里斯会员。详情请咨询俱乐部基金会主席。"
            )}
          </div>
        </div>
      )}

      <div className="container-page py-12 grid gap-6 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 p-6">
          <h2 className="font-bold text-slate-900 mb-4">{t("Миний мэдээлэл", "My Info", "私の情報", "我的资料")}</h2>
          <dl className="text-sm text-slate-600 space-y-2">
            <Row label={t("И-мэйл", "Email", "メール", "邮箱")} value={member.email} />
            <Row label={t("Утас", "Phone", "電話", "电话")} value={member.phone ?? "—"} />
            <Row label={t("Хот", "City", "都市", "城市")} value={member.city ?? "—"} />
            <Row label={t("Мэргэжил", "Classification", "職業", "职业")} value={member.classification ?? "—"} />
          </dl>
          <p className="text-xs text-slate-400 mt-4">
            {t(
              "Мэдээллээ засах боломж удахгүй нэмэгдэнэ.",
              "Editing your profile will be enabled here soon.",
              "プロフィール編集機能は近日追加予定です。",
              "个人资料编辑功能即将上线。"
            )}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 p-6">
          <h2 className="font-bold text-slate-900 mb-4">{t("Зураг байршуулах", "Photo Uploads", "写真アップロード", "照片上传")}</h2>
          <p className="text-sm text-slate-500">
            {t(
              "Төслийн зураг байршуулах боломж удахгүй нэмэгдэнэ.",
              "Uploading photos into project folders will be enabled here soon.",
              "プロジェクトフォルダへの写真アップロード機能は近日追加予定です。",
              "上传照片至项目文件夹的功能即将上线。"
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-slate-100 pb-2">
      <dt className="text-slate-400">{label}</dt>
      <dd className="font-medium text-slate-700">{value}</dd>
    </div>
  );
}
