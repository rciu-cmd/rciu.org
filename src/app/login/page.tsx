"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { asset } from "@/lib/asset";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/language-context";

export default function LoginPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [linkSent, setLinkSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If this page was opened from the sign-in link in the email, Supabase
  // picks up the session from the URL automatically — this just catches
  // that moment and moves on to the member dashboard.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) router.replace("/dashboard/");
    });
    return () => sub.subscription.unsubscribe();
  }, [router]);

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${window.location.origin}${asset("/login/")}`,
      },
    });
    setBusy(false);
    if (error) {
      setError(
        /signups not allowed|user not found/i.test(error.message)
          ? t(
              "Энэ и-мэйл бүртгэлд байхгүй байна. Клубын админтай холбогдоно уу.",
              "This email isn't registered as a member. Contact the club admin.",
              "このメールアドレスは会員登録されていません。管理者にご連絡ください。",
              "该邮箱未注册为会员。请联系俱乐部管理员。"
            )
          : error.message
      );
      return;
    }
    setLinkSent(true);
  }

  return (
    <div className="container-page py-16">
      <div className="mx-auto max-w-md">
        <h1 className="text-2xl font-bold text-rotary-royal-blue mb-2">
          {t("Гишүүн нэвтрэх", "Member Login", "会員ログイン", "会员登录")}
        </h1>
        <p className="text-slate-600 text-sm mb-8">
          {t(
            "Бүртгэлтэй и-мэйл хаягаа оруулбал нэвтрэх холбоос илгээнэ — нууц үг шаардлагагүй.",
            "Enter your registered email and we'll send a sign-in link — no password needed.",
            "登録済みのメールアドレスを入力すると、ログインリンクが送信されます。パスワードは不要です。",
            "输入您注册的邮箱,我们将发送登录链接 — 无需密码。"
          )}
        </p>

        {linkSent ? (
          <div className="rounded-xl bg-green-50 border border-green-200 p-6 text-green-800 text-sm">
            {t(
              "Холбоос илгээгдлээ! И-мэйлээ шалгана уу.",
              "Link sent! Check your email.",
              "リンクを送信しました!メールをご確認ください。",
              "链接已发送!请查收邮箱。"
            )}
          </div>
        ) : (
          <form onSubmit={sendLink} className="space-y-4">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-rotary-royal-blue"
            />
            {error && <p className="text-sm text-rotary-cardinal">{error}</p>}
            <button
              type="submit"
              disabled={busy}
              className="w-full bg-rotary-royal-blue text-white font-semibold rounded-md py-2.5 disabled:opacity-60"
            >
              {busy ? t("Илгээж байна…", "Sending…", "送信中…", "发送中…") : t("Холбоос авах", "Send Link", "リンクを送信", "发送链接")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
