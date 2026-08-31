"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { asset } from "@/lib/asset";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/language-context";
import ProjectPhotoCollage from "@/components/ProjectPhotoCollage";

type ProjectStatus = "ongoing" | "completed" | "planned";

type ProjectRow = {
  id: string;
  title_mn: string;
  title_en: string;
  description_mn: string | null;
  description_en: string | null;
  status: ProjectStatus;
  cover_image_url: string | null;
  project_type: "local_project" | "district_grant" | "global_grant";
  funding_amount: number | null;
  funding_currency: string;
  grant_number: string | null;
};

const STATUS_LABEL: Record<ProjectStatus, { mn: string; en: string; ja: string; zh: string }> = {
  ongoing: { mn: "Хэрэгжиж буй", en: "Ongoing", ja: "実施中", zh: "進行中" },
  completed: { mn: "Хаагдсан", en: "Completed", ja: "完了", zh: "已完成" },
  planned: { mn: "Төлөвлөж буй", en: "Planned", ja: "計画中", zh: "計劃中" },
};

export default function ProjectsPage() {
  const { t } = useLanguage();
  const [items, setItems] = useState<ProjectRow[] | null>(null);
  const [photosByProject, setPhotosByProject] = useState<Record<string, string[]>>({});
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [showDonate, setShowDonate] = useState(false);

  useEffect(() => {
    supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => setItems((data as ProjectRow[]) ?? []));

    // Up to 3 photos per project, for the auto-collage on each card —
    // same project_media rows the member dashboard uploads into and
    // the public gallery already reads.
    supabase
      .from("project_media")
      .select("project_id,storage_path,created_at")
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        const grouped: Record<string, string[]> = {};
        for (const row of (data as { project_id: string; storage_path: string }[]) ?? []) {
          const url = supabase.storage.from("rciu-photos").getPublicUrl(row.storage_path).data.publicUrl;
          (grouped[row.project_id] ??= []).push(url);
        }
        for (const id in grouped) grouped[id] = grouped[id].slice(0, 3);
        setPhotosByProject(grouped);
      });
  }, []);

  return (
    <div className="container-page py-14">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
        <h1 className="text-3xl font-bold text-rotary-royal-blue">
          {t("Төслүүд", "Projects", "プロジェクト", "項目")}
        </h1>
        <div className="flex gap-3">
          <button
            onClick={() => setShowDonate(true)}
            className="text-sm font-semibold bg-rotary-gold text-[#5a3d0a] rounded-full px-5 py-2 hover:brightness-95 transition"
          >
            {t("Хандив өргөх", "Donate", "寄付する", "捐款")}
          </button>
          <button
            onClick={() => setShowJoinForm(true)}
            className="text-sm font-semibold border-2 border-rotary-royal-blue text-rotary-royal-blue rounded-full px-5 py-2 hover:bg-rotary-royal-blue hover:text-white transition"
          >
            {t("Төсөлд нэгдэх", "Join a Project", "プロジェクトに参加", "加入項目")}
          </button>
        </div>
      </div>
      <p className="text-slate-600 max-w-2xl mb-10">
        {t("Клубын хэрэгжүүлж буй болон дуусгасан төслүүд.", "Ongoing and completed community service projects.", "実施中および完了したコミュニティ・サービス・プロジェクト。", "正在進行和已完成的社區服務項目。")}
      </p>

      {showJoinForm && <JoinProjectModal t={t} projects={items ?? []} onClose={() => setShowJoinForm(false)} />}
      {showDonate && <DonateModal t={t} onClose={() => setShowDonate(false)} />}

      {items === null && <p className="text-slate-400 text-sm">{t("Ачааллаж байна…", "Loading…", "読み込み中…", "加載中…")}</p>}

      {items && items.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
          {t(
            "Төслийн мэдээлэл удахгүй нэмэгдэнэ.",
            "Project details will appear here once added by an admin.",
            "プロジェクト情報は管理者が追加次第、表示されます。",
            "項目信息將在管理員添加後顯示。"
          )}
        </div>
      )}

      {items && items.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => {
            const photos = photosByProject[p.id] ?? (p.cover_image_url ? [p.cover_image_url] : []);
            return (
              <Link key={p.id} href={`/projects/view/?id=${p.id}`} className="block">
                <article className="h-full rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-1 transition">
                  {photos.length > 0 && <ProjectPhotoCollage photos={photos} />}
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block text-xs font-semibold uppercase tracking-wide text-rotary-azure">
                        {t(STATUS_LABEL[p.status].mn, STATUS_LABEL[p.status].en, STATUS_LABEL[p.status].ja, STATUS_LABEL[p.status].zh)}
                      </span>
                      {p.project_type !== "local_project" && (
                        <span className="inline-block text-[10px] font-bold text-white bg-rotary-gold rounded-full px-2 py-0.5">
                          {p.project_type === "global_grant" ? "GG" : "DG"}
                        </span>
                      )}
                    </div>
                    <h2 className="font-bold text-slate-900 mb-2">{t(p.title_mn, p.title_en)}</h2>
                    {p.description_en && <p className="text-slate-600 text-sm line-clamp-3">{t(p.description_mn ?? "", p.description_en)}</p>}
                    {p.funding_amount != null && (
                      <p className="text-sm text-rotary-azure font-semibold mt-3">
                        {p.funding_currency} {p.funding_amount.toLocaleString()}
                        {p.grant_number && ` · ${p.grant_number}`}
                      </p>
                    )}
                  </div>
                </article>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Bank transfer details for direct donations — the club's own account,
// not a third-party payment processor, so this is just informational
// (name/copy the details, then wire transfer from the donor's bank).
const DONATE_ACCOUNT = {
  accountName: "ИХ ӨРГӨӨ РОТАРИ КЛУБ",
  accountNumber: "106201860897",
  iban: "MN150034106201860897",
  currency: "MNT",
};

function DonateModal({ t, onClose }: { t: (mn: string, en: string, ja?: string, zh?: string) => string; onClose: () => void }) {
  const rows: [string, string][] = [
    [t("Дансны нэр", "Account Name", "口座名義", "賬戶名稱"), DONATE_ACCOUNT.accountName],
    [t("Дансны дугаар", "Account Number", "口座番号", "賬號"), DONATE_ACCOUNT.accountNumber],
    [t("IBAN дугаар", "IBAN", "IBAN", "IBAN"), DONATE_ACCOUNT.iban],
    [t("Валют", "Currency", "通貨", "幣種"), DONATE_ACCOUNT.currency],
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 p-6 border-b border-slate-100">
          <Image src={asset("/logos/rciu-emblem.jpg")} alt="RCIU" width={40} height={40} className="rounded-full shrink-0" />
          <div>
            <p className="font-bold text-rotary-royal-blue leading-tight">Rotary Club of Ikh Urgoo</p>
            <p className="text-xs text-slate-400">{t("Дансны мэдээлэл", "Bank Account Information", "口座情報", "銀行賬戶信息")}</p>
          </div>
        </div>
        <div className="p-6">
          <p className="text-sm text-slate-500 mb-4">
            {t(
              "Клубын дансаар шууд шилжүүлэг хийж хандив өргөх боломжтой.",
              "You can donate directly by bank transfer to the club's account below.",
              "以下のクラブ口座へ直接お振込みいただけます。",
              "您可以直接向以下俱樂部賬戶轉賬捐款。"
            )}
          </p>
          <dl className="rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
            {rows.map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-4 px-4 py-3">
                <dt className="text-xs text-slate-400 shrink-0">{label}</dt>
                <dd className="font-semibold text-slate-900 text-right break-all">{value}</dd>
              </div>
            ))}
          </dl>
          <button onClick={onClose} className="mt-6 w-full text-sm font-semibold bg-rotary-royal-blue text-white rounded-md py-2.5">
            {t("Хаах", "Close", "閉じる", "關閉")}
          </button>
        </div>
      </div>
    </div>
  );
}

// A professional "get involved" form for outside clubs/individuals —
// not the member-facing join_inquiries form on /join, which is for
// people wanting to become RCIU members. This is specifically for
// clubs (including from other countries) or organizations interested
// in partnering on a project. Submissions land in project_inquiries,
// visible to super admins under Admin → Project Inquiries.
function JoinProjectModal({
  t,
  projects,
  onClose,
}: {
  t: (mn: string, en: string, ja?: string, zh?: string) => string;
  projects: ProjectRow[];
  onClose: () => void;
}) {
  const [form, setForm] = useState({ club_name: "", contact_name: "", email: "", project_id: "", message: "" });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.from("project_inquiries").insert({
      club_name: form.club_name,
      contact_name: form.contact_name || null,
      email: form.email,
      project_id: form.project_id || null,
      message: form.message || null,
    });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 p-6 border-b border-slate-100">
          <Image src={asset("/logos/rciu-emblem.jpg")} alt="RCIU" width={40} height={40} className="rounded-full shrink-0" />
          <div>
            <p className="font-bold text-rotary-royal-blue leading-tight">Rotary Club of Ikh Urgoo</p>
            <p className="text-xs text-slate-400">{t("Төсөлд нэгдэх хүсэлт", "Project Partnership Request", "プロジェクト参加依頼", "項目合作申請")}</p>
          </div>
        </div>

        <div className="p-6">
          {done ? (
            <div className="text-center py-6">
              <p className="text-xl font-bold text-rotary-royal-blue mb-2">{t("Баярлалаа!", "Thank you!", "ありがとうございます!", "謝謝!")}</p>
              <p className="text-slate-600 text-sm mb-6">
                {t(
                  "Таны хүсэлтийг хүлээн авлаа. Бид удахгүй тантай холбогдоно.",
                  "We've received your request and will be in touch soon.",
                  "お問い合わせを受け付けました。まもなくご連絡いたします。",
                  "我們已收到您的申請，會盡快與您聯繫。"
                )}
              </p>
              <button onClick={onClose} className="text-sm font-semibold bg-rotary-royal-blue text-white rounded-md px-5 py-2">
                {t("Хаах", "Close", "閉じる", "關閉")}
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="grid gap-3">
              <p className="text-sm text-slate-500 mb-1">
                {t(
                  "Өөр клуб, байгууллага эсвэл хувь хүнээр манай төсөлд хамтран ажиллахыг хүсвэл доорх маягтыг бөглөнө үү.",
                  "Interested in partnering on one of our projects — as another club (including from abroad), organization, or individual? Fill out the form below.",
                  "他のクラブ(海外含む)、団体、個人としてプロジェクトへの参加をご希望の方は、以下のフォームにご記入ください。",
                  "無論您來自其他俱樂部（包括國外）、機構還是個人，如有意合作，請填寫以下表格。"
                )}
              </p>
              <input
                required
                placeholder={t("Клуб/байгууллагын нэр", "Club / organization name", "クラブ・団体名", "俱樂部/機構名稱")}
                value={form.club_name}
                onChange={(e) => setForm({ ...form, club_name: e.target.value })}
                className="rounded-md border border-slate-300 px-3 py-2.5 text-sm"
              />
              <input
                placeholder={t("Холбогдох хүн (заавал биш)", "Contact person (optional)", "担當者名(任意)", "聯繫人(可選)")}
                value={form.contact_name}
                onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                className="rounded-md border border-slate-300 px-3 py-2.5 text-sm"
              />
              <input
                required
                type="email"
                placeholder={t("И-мэйл", "Email", "メール", "郵箱")}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="rounded-md border border-slate-300 px-3 py-2.5 text-sm"
              />
              {projects.length > 0 && (
                <select
                  value={form.project_id}
                  onChange={(e) => setForm({ ...form, project_id: e.target.value })}
                  className="rounded-md border border-slate-300 px-3 py-2.5 text-sm"
                >
                  <option value="">{t("Ерөнхий сонирхол (тодорхой төсөлгүй)", "General interest (no specific project)", "特定のプロジェクトなし", "一般興趣（不限項目）")}</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.title_en}</option>
                  ))}
                </select>
              )}
              <textarea
                placeholder={t("Мессеж (заавал биш)", "Message (optional)", "メッセージ(任意)", "留言(可選)")}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                rows={3}
                className="rounded-md border border-slate-300 px-3 py-2.5 text-sm"
              />
              {error && <p className="text-sm text-rotary-cardinal">{error}</p>}
              <div className="flex gap-2 mt-1">
                <button type="submit" disabled={busy} className="flex-1 bg-rotary-royal-blue text-white font-semibold rounded-md py-2.5 text-sm disabled:opacity-60">
                  {busy ? t("Илгээж байна…", "Sending…", "送信中…", "發送中…") : t("Илгээх", "Send", "送信", "提交")}
                </button>
                <button type="button" onClick={onClose} className="text-sm font-semibold px-4 rounded-md border border-slate-300 text-slate-600">
                  {t("Цуцлах", "Cancel", "キャンセル", "取消")}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
