"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/language-context";
import { friendlyError } from "@/lib/friendly-error";
import { HoneypotField, INQUIRY_MAX_LENGTH, inquiryLimitMessage } from "@/lib/spam-guard";

const STEPS = [
  {
    mn: "Хурал дээр зочноор ирж, манай гишүүдтэй танилцана уу.",
    en: "Come as a guest to a meeting and get to know our members.",
    ja: "例会にゲストとして参加し、会員と交流してください。",
    zh: "以來賓身分參加例會，認識我們的社友。",
    ko: "게스트로 주회에 참석해 회원들과 만나 보세요.",
  },
  {
    mn: "Доорх маягтыг бөглөвөл бид тантай холбогдоно.",
    en: "Fill out the form below and we'll reach out to you.",
    ja: "下のフォームにご記入いただければ、こちらからご連絡します。",
    zh: "填寫下方表格，我們將與您聯絡。",
    ko: "아래 양식을 작성하시면 연락드리겠습니다.",
  },
  {
    mn: "Клубын гишүүнчлэлийн хороотой уулзаж, гишүүнээр албан ёсоор элсэнэ.",
    en: "Meet with the club's membership committee and formally join.",
    ja: "クラブの会員増強委員会と面談し、正式に入会します。",
    zh: "與本社社員委員會面談後，正式入社。",
    ko: "클럽 회원위원회와 면담한 후 정식으로 가입합니다.",
  },
];

export default function JoinPage() {
  const { t } = useLanguage();
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [honeypot, setHoneypot] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    // Bot filled the hidden field — show "thank you", save nothing.
    if (honeypot) {
      setDone(true);
      return;
    }
    setBusy(true);
    setError(null);
    const { error } = await supabase.from("join_inquiries").insert({
      name: form.name,
      email: form.email,
      phone: form.phone || null,
      message: form.message || null,
    });
    setBusy(false);
    if (error) {
      console.error(error);
      setError(inquiryLimitMessage(error.message, t) ?? friendlyError(error.message, t));
      return;
    }
    setDone(true);
  }

  return (
    <div className="container-page py-14">
      <div className="grid gap-12 lg:grid-cols-2">
        <div>
          <h1 className="text-3xl font-bold text-rotary-royal-blue mb-4">
            {t("Бидэнтэй нэгдээрэй", "Join Our Club", "私たちに加わりませんか", "加入本社", "우리 클럽에 가입하세요")}
          </h1>
          <p className="text-slate-600 mb-8 max-w-md">
            {t(
              "Их Өргөө Ротари Клуб нь орон нутгаа хөгжүүлэхийг хүсдэг хэн бүхэнд нээлттэй. Хэрхэн нэгдэх талаар:",
              "Rotary Club of Ikh Urgoo is open to anyone who wants to make a difference in their community. Here's how to join:",
              "イク・ウルグー・ロータリークラブは、地域社会に貢献したいと願うすべての方に開かれています。入会方法：",
              "伊赫烏爾古扶輪社歡迎所有希望為社區帶來改變的人加入。入社方式：",
              "이흐 우르구 로타리클럽은 지역사회에 변화를 만들고 싶은 모든 분께 열려 있습니다. 가입 방법:"
            )}
          </p>
          <ol className="space-y-4 mb-10">
            {STEPS.map((s, i) => (
              <li key={i} className="flex gap-4">
                <span className="w-8 h-8 rounded-full bg-rotary-royal-blue text-white flex items-center justify-center font-bold text-sm shrink-0">
                  {i + 1}
                </span>
                <p className="text-slate-700 pt-1">{t(s.mn, s.en, s.ja, s.zh, s.ko)}</p>
              </li>
            ))}
          </ol>
        </div>

        <div className="rounded-2xl border border-slate-200 shadow-sm p-8">
          {done ? (
            <div className="text-center py-10">
              <p className="text-xl font-bold text-rotary-royal-blue mb-2">
                {t("Баярлалаа!", "Thank you!", "ありがとうございます！", "謝謝！", "감사합니다!")}
              </p>
              <p className="text-slate-600">
                {t(
                  "Таны хүсэлтийг хүлээн авлаа. Бид удахгүй тантай холбогдох болно.",
                  "We've received your inquiry and will be in touch soon.",
                  "お問い合わせを受け付けました。まもなくご連絡いたします。",
                  "我們已收到您的申請，會盡快與您聯絡。",
                  "문의를 접수했습니다. 곧 연락드리겠습니다."
                )}
              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="grid gap-4">
              <h2 className="font-bold text-slate-900 mb-1">
                {t("Сонирхлын хүсэлт илгээх", "Send an Interest Form", "入会のお問い合わせ", "提交入社意向", "가입 문의 보내기")}
              </h2>
              <input
                required
                maxLength={INQUIRY_MAX_LENGTH.name}
                placeholder={t("Нэр", "Full Name", "お名前", "姓名", "성명")}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="rounded-md border border-slate-300 px-3 py-2.5 text-sm"
              />
              <input
                required
                type="email"
                maxLength={INQUIRY_MAX_LENGTH.email}
                placeholder={t("И-мэйл", "Email", "メール", "電子郵件", "이메일")}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="rounded-md border border-slate-300 px-3 py-2.5 text-sm"
              />
              <input
                maxLength={INQUIRY_MAX_LENGTH.phone}
                placeholder={t("Утас (заавал биш)", "Phone (optional)", "電話（任意）", "電話（選填）", "전화번호 (선택)")}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="rounded-md border border-slate-300 px-3 py-2.5 text-sm"
              />
              <textarea
                placeholder={t("Бидэнд юу хэлэхийг хүсэж байна вэ? (заавал биш)", "Anything you'd like us to know? (optional)", "お伝えしたいこと（任意）", "有什麼想告訴我們的嗎？（選填）", "전하고 싶은 말씀이 있으신가요? (선택)")}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                rows={4}
                maxLength={INQUIRY_MAX_LENGTH.message}
                className="rounded-md border border-slate-300 px-3 py-2.5 text-sm"
              />
              <HoneypotField value={honeypot} onChange={setHoneypot} />
              {error && <p className="text-sm text-rotary-cardinal">{error}</p>}
              <button
                type="submit"
                disabled={busy}
                className="bg-rotary-royal-blue text-white font-semibold rounded-md py-2.5 text-sm disabled:opacity-60"
              >
                {busy ? t("Илгээж байна…", "Sending…", "送信中…", "傳送中…", "보내는 중…") : t("Илгээх", "Send", "送信", "送出", "보내기")}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
