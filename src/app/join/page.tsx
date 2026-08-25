"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/language-context";

const STEPS = [
  {
    mn: "Хурал дээр зочноор ирж, манай гишүүдтэй танилцана уу.",
    en: "Come as a guest to a meeting and get to know our members.",
  },
  {
    mn: "Доорх маягтыг бөглөж, бид тантай холбогдоно.",
    en: "Fill out the form below and we'll reach out to you.",
  },
  {
    mn: "Клубын гишүүнчлэлийн хорооноос уулзалт хийж, гишүүнээр элсэнэ.",
    en: "Meet with the club's membership committee and formally join.",
  },
];

export default function JoinPage() {
  const { t } = useLanguage();
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
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
      setError(error.message);
      return;
    }
    setDone(true);
  }

  return (
    <div className="container-page py-14">
      <div className="grid gap-12 lg:grid-cols-2">
        <div>
          <h1 className="text-3xl font-bold text-rotary-royal-blue mb-4">
            {t("Бидэнтэй нэгдээрэй", "Join Our Club", "私たちに加わりませんか", "加入我们")}
          </h1>
          <p className="text-slate-600 mb-8 max-w-md">
            {t(
              "Rotary Club of Ikh Urgoo нь орон нутгаа хөгжүүлэхийг хүсдэг хэн бүхэнд нээлттэй. Хэрхэн нэгдэх талаар:",
              "Rotary Club of Ikh Urgoo is open to anyone who wants to make a difference in their community. Here's how to join:",
              "イク・ウルグー・ロータリークラブは、地域社会に貢献したいと願うすべての方に開かれています。入会方法:",
              "扶轮伊赫乌尔古俱乐部欢迎所有希望为社区做出贡献的人。加入方式:"
            )}
          </p>
          <ol className="space-y-4 mb-10">
            {STEPS.map((s, i) => (
              <li key={i} className="flex gap-4">
                <span className="w-8 h-8 rounded-full bg-rotary-royal-blue text-white flex items-center justify-center font-bold text-sm shrink-0">
                  {i + 1}
                </span>
                <p className="text-slate-700 pt-1">{t(s.mn, s.en)}</p>
              </li>
            ))}
          </ol>
        </div>

        <div className="rounded-2xl border border-slate-200 shadow-sm p-8">
          {done ? (
            <div className="text-center py-10">
              <p className="text-xl font-bold text-rotary-royal-blue mb-2">
                {t("Баярлалаа!", "Thank you!", "ありがとうございます!", "谢谢!")}
              </p>
              <p className="text-slate-600">
                {t(
                  "Таны хүсэлтийг хүлээн авлаа. Бид удахгүй тантай холбогдох болно.",
                  "We've received your inquiry and will be in touch soon.",
                  "お問い合わせを受け付けました。まもなくご連絡いたします。",
                  "我们已收到您的申请,会尽快与您联系。"
                )}
              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="grid gap-4">
              <h2 className="font-bold text-slate-900 mb-1">
                {t("Сонирхож буй хүсэлт илгээх", "Send an Interest Form", "お問い合わせフォーム", "提交入会申请")}
              </h2>
              <input
                required
                placeholder={t("Нэр", "Full Name", "お名前", "姓名")}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="rounded-md border border-slate-300 px-3 py-2.5 text-sm"
              />
              <input
                required
                type="email"
                placeholder={t("И-мэйл", "Email", "メール", "邮箱")}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="rounded-md border border-slate-300 px-3 py-2.5 text-sm"
              />
              <input
                placeholder={t("Утас (заавал биш)", "Phone (optional)", "電話(任意)", "电话(可选)")}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="rounded-md border border-slate-300 px-3 py-2.5 text-sm"
              />
              <textarea
                placeholder={t("Бидэнд юу хэлэхийг хүсэж байна вэ? (заавал биш)", "Anything you'd like us to know? (optional)", "お伝えしたいこと(任意)", "有什么想告诉我们的吗?(可选)")}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                rows={4}
                className="rounded-md border border-slate-300 px-3 py-2.5 text-sm"
              />
              {error && <p className="text-sm text-rotary-cardinal">{error}</p>}
              <button
                type="submit"
                disabled={busy}
                className="bg-rotary-royal-blue text-white font-semibold rounded-md py-2.5 text-sm disabled:opacity-60"
              >
                {busy ? t("Илгээж байна…", "Sending…", "送信中…", "发送中…") : t("Илгээх", "Send", "送信", "提交")}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
