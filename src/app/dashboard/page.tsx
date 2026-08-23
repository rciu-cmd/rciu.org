"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/language-context";
import { phfTheme } from "@/lib/phf";
import PhfPinBadge from "@/components/PhfPinBadge";

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
  password_set: boolean;
  is_admin: boolean;
};

type EventRow = {
  id: string;
  title_mn: string;
  title_en: string;
  location: string | null;
  event_date: string;
  event_time: string | null;
};

export default function DashboardPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [member, setMember] = useState<Member | null>(null);
  const [events, setEvents] = useState<EventRow[] | null>(null);
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

      // Rotary calendar with upcoming events — read-only here, managed
      // from /admin/events. Reminder emails go out manually (a button
      // in the admin calendar), not automatically.
      const today = new Date().toISOString().slice(0, 10);
      const { data: upcoming } = await supabase
        .from("events")
        .select("id, title_mn, title_en, location, event_date, event_time")
        .gte("event_date", today)
        .order("event_date", { ascending: true })
        .limit(5);
      setEvents((upcoming as EventRow[]) ?? []);
    });
  }, [router]);

  function handlePasswordSet() {
    setMember((m) => (m ? { ...m, password_set: true } : m));
  }

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
              <PhfPinBadge level={member.phf_level} size={24} />
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
          {member.is_admin && (
            <Link
              href="/admin"
              className="mt-4 inline-flex items-center gap-2 bg-white text-rotary-royal-blue font-semibold rounded-full px-4 py-1.5 text-sm hover:bg-white/90"
            >
              {t("Админ самбар руу очих", "Go to Admin Dashboard", "管理者ダッシュボードへ", "前往管理后台")} →
            </Link>
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

      {!member.password_set && (
        <div className="container-page pt-10">
          <SetPasswordCard t={t} onDone={handlePasswordSet} />
        </div>
      )}

      <div className="container-page pt-12">
        <div className="rounded-xl border border-slate-200 p-6">
          <h2 className="font-bold text-slate-900 mb-4">{t("Удахгүй болох арга хэмжээ", "Upcoming Events", "今後の予定", "即将举行的活动")}</h2>
          {events === null && <p className="text-sm text-slate-400">{t("Ачааллаж байна…", "Loading…", "読み込み中…", "加载中…")}</p>}
          {events && events.length === 0 && (
            <p className="text-sm text-slate-400">{t("Одоогоор төлөвлөсөн арга хэмжээ алга.", "No upcoming events scheduled right now.", "現在予定されているイベントはありません。", "目前没有安排的活动。")}</p>
          )}
          {events && events.length > 0 && (
            <ul className="grid gap-3 sm:grid-cols-2">
              {events.map((ev) => (
                <li key={ev.id} className="rounded-lg bg-slate-50 border border-slate-100 px-4 py-3">
                  <p className="text-xs font-semibold text-rotary-azure">
                    {ev.event_date}{ev.event_time ? ` · ${ev.event_time}` : ""}
                  </p>
                  <p className="font-medium text-slate-800">{t(ev.title_mn, ev.title_en)}</p>
                  {ev.location && <p className="text-xs text-slate-500">{ev.location}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

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

        <PhotoUploadCard t={t} />
      </div>
    </div>
  );
}

type Category = "installation_ceremony" | "district_events" | "projects" | "other";

const CATEGORY_LABELS: Record<Category, { mn: string; en: string }> = {
  installation_ceremony: { mn: "Албан ёсны хүлээлцэх ёслол", en: "Installation Ceremony" },
  district_events: { mn: "Дүүргийн арга хэмжээ", en: "District Event" },
  projects: { mn: "Төсөл", en: "Project" },
  other: { mn: "Бусад", en: "Other" },
};

// Uploads into the folder convention the club asked for:
// {year}/{category}/{filename}, e.g. 2026/installation_ceremony/....
// Files with category "projects" also get linked to a specific
// project (project_media); everything else lands in the general
// club_photos library. Requires the rciu-photos Storage bucket —
// see supabase/migration06_photo_storage_bucket.sql.
function PhotoUploadCard({ t }: { t: (mn: string, en: string, ja?: string, zh?: string) => string }) {
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const [category, setCategory] = useState<Category>("other");
  const [projects, setProjects] = useState<{ id: string; title_en: string }[]>([]);
  const [projectId, setProjectId] = useState("");
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (category !== "projects") return;
    supabase.from("projects").select("id, title_en").order("created_at", { ascending: false }).then(({ data }) => {
      setProjects((data as { id: string; title_en: string }[]) ?? []);
    });
  }, [category]);

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    setError(null);
    setDone(false);

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      setBusy(false);
      setError(t("Дахин нэвтэрнэ үү.", "Please log in again.", "再度ログインしてください。", "请重新登录。"));
      return;
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    const folder = category === "projects" && projectId
      ? `${year}/projects/${projectId}`
      : `${year}/${category}`;
    const path = `${folder}/${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage.from("rciu-photos").upload(path, file);
    if (uploadError) {
      setBusy(false);
      setError(uploadError.message);
      return;
    }

    const insertError =
      category === "projects" && projectId
        ? (await supabase.from("project_media").insert({
            project_id: projectId,
            uploaded_by: session.user.id,
            storage_path: path,
            caption: caption || null,
          })).error
        : (await supabase.from("club_photos").insert({
            year,
            category: category === "projects" ? "other" : category,
            storage_path: path,
            caption: caption || null,
            uploaded_by: session.user.id,
          })).error;

    setBusy(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setFile(null);
    setCaption("");
    setDone(true);
  }

  return (
    <div className="rounded-xl border border-slate-200 p-6">
      <h2 className="font-bold text-slate-900 mb-4">{t("Зураг байршуулах", "Photo Uploads", "写真アップロード", "照片上传")}</h2>
      <form onSubmit={upload} className="grid gap-3">
        <div className="grid grid-cols-2 gap-3">
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            {Array.from({ length: 6 }, (_, i) => thisYear + 1 - i).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <select value={category} onChange={(e) => setCategory(e.target.value as Category)} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            {(Object.keys(CATEGORY_LABELS) as Category[]).map((c) => (
              <option key={c} value={c}>{t(CATEGORY_LABELS[c].mn, CATEGORY_LABELS[c].en)}</option>
            ))}
          </select>
        </div>

        {category === "projects" && (
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="">{t("Төсөл сонгох", "Select a project", "プロジェクトを選択", "选择项目")}</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.title_en}</option>
            ))}
          </select>
        )}

        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-sm"
        />
        <input
          placeholder={t("Тайлбар (заавал биш)", "Caption (optional)", "キャプション(任意)", "说明(可选)")}
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        />

        {error && <p className="text-sm text-rotary-cardinal">{error}</p>}
        {done && (
          <p className="text-sm text-green-700">{t("Зураг байршуулагдлаа!", "Photo uploaded!", "写真をアップロードしました!", "照片已上传!")}</p>
        )}

        <button
          type="submit"
          disabled={busy || !file || (category === "projects" && !projectId)}
          className="justify-self-start bg-rotary-royal-blue text-white font-semibold rounded-md px-5 py-2 text-sm disabled:opacity-60"
        >
          {busy ? t("Байршуулж байна…", "Uploading…", "アップロード中…", "上传中…") : t("Байршуулах", "Upload", "アップロード", "上传")}
        </button>
      </form>
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

// One-time nudge: the member signed in via the emailed link, so this
// account has no password yet — Supabase's magic-link flow never asks
// for one. Setting a password here flips members.password_set so the
// login page's password tab works next time, without needing a fresh
// email (which is also capped at 2/hour on the default email plan).
function SetPasswordCard({
  t,
  onDone,
}: {
  t: (mn: string, en: string, ja?: string, zh?: string) => string;
  onDone: () => void;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError(t("Нууц үг дор хаяж 8 тэмдэгт байх ёстой.", "Password must be at least 8 characters.", "パスワードは8文字以上にしてください。", "密码至少需要8个字符。"));
      return;
    }
    if (password !== confirm) {
      setError(t("Нууц үг таарахгүй байна.", "Passwords don't match.", "パスワードが一致しません。", "两次输入的密码不一致。"));
      return;
    }
    setBusy(true);
    const { error: authError } = await supabase.auth.updateUser({ password });
    if (authError) {
      setBusy(false);
      setError(authError.message);
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase.from("members").update({ password_set: true }).eq("id", session.user.id);
    }
    setBusy(false);
    setDone(true);
    onDone();
  }

  if (done) {
    return (
      <div className="rounded-xl bg-green-50 border border-green-200 p-6 text-green-800 text-sm">
        {t(
          "Нууц үг тохирогдлоо! Дараагийн удаа шууд нууц үгээрээ нэвтэрч болно.",
          "Password set! Next time you can log in directly with your password.",
          "パスワードを設定しました!次回からパスワードで直接ログインできます。",
          "密码已设置!下次可直接使用密码登录。"
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border-2 border-rotary-gold bg-amber-50 p-6">
      <h2 className="font-bold text-slate-900 mb-1">
        {t("Нууц үгээ тохируулаарай", "Set a password", "パスワードを設定してください", "设置密码")}
      </h2>
      <p className="text-sm text-slate-600 mb-4">
        {t(
          "Та и-мэйл холбоосоор нэвтэрлээ. Нууц үг тохируулбал дараа бүр холбоос хүлээхгүйгээр шууд нэвтэрч болно.",
          "You signed in with an email link. Set a password now so future logins don't need a new emailed link.",
          "メールリンクでログインしました。パスワードを設定すると、次回から新しいリンクを待たずにログインできます。",
          "您通过邮件链接登录。现在设置密码,以后登录无需再等待新链接。"
        )}
      </p>
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-3 sm:items-start">
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t("Шинэ нууц үг", "New password", "新しいパスワード", "新密码")}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-rotary-royal-blue"
        />
        <input
          type="password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder={t("Дахин оруулах", "Confirm password", "確認用パスワード", "确认密码")}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-rotary-royal-blue"
        />
        <button
          type="submit"
          disabled={busy}
          className="bg-rotary-royal-blue text-white font-semibold rounded-md py-2 text-sm disabled:opacity-60"
        >
          {busy ? t("Хадгалж байна…", "Saving…", "保存中…", "保存中…") : t("Хадгалах", "Save Password", "保存", "保存")}
        </button>
      </form>
      {error && <p className="text-sm text-rotary-cardinal mt-3">{error}</p>}
    </div>
  );
}
