"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { asset } from "@/lib/asset";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/language-context";

type Mode = "link" | "password";

export default function LoginPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [linkSent, setLinkSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputClass = "w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-rotary-royal-blue";

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
          : /rate limit/i.test(error.message)
          ? t(
              "И-мэйлийн хязгаарт хүрсэн байна — түр хүлээгээд дахин оролдоно уу.",
              "Email rate limit reached — please wait a bit and try again.",
              "メール送信の上限に達しました。しばらくしてから再度お試しください。",
              "邮件发送已达上限,请稍后再试。"
            )
          : error.message
      );
      return;
    }
    setLinkSent(true);
  }

  async function loginPassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) {
      setError(
        t(
          "И-мэйл эсвэл нууц үг буруу байна. Нууц үг тохируулаагүй бол «И-мэйл холбоос» ашиглана уу.",
          "Incorrect email or password. If you haven't set a password yet, use the \"Email link\" option.",
          "メールアドレスまたはパスワードが正しくありません。まだパスワードを設定していない場合は「メールリンク」をご利用ください。",
          "邮箱或密码不正确。如果您还未设置密码,请使用「邮件链接」选项。"
        )
      );
      return;
    }
    router.push("/dashboard/");
  }

  return (
    <div className="container-page py-16">
      <div className="mx-auto max-w-md">
        <h1 className="text-2xl font-bold text-rotary-royal-blue mb-2">
          {t("Гишүүн нэвтрэх", "Member Login", "会員ログイン", "会员登录")}
        </h1>
        <p className="text-slate-600 text-sm mb-6">
          {t(
            "Анх удаа нэвтэрч байгаа бол «И-мэйл холбоос»-г ашиглана уу — дараа нь нэвтрэх бүрд нууц үгээ ашиглаж болно.",
            "First time logging in? Use \"Email link\" — after that, you can set a password and use it every time.",
            "初めてログインする場合は「メールリンク」をご利用ください。その後、パスワードを設定すれば毎回それを使えます。",
            "首次登录请使用「邮件链接」— 之后您可以设置密码,每次登录都可使用。"
          )}
        </p>

        <div className="mb-6 grid grid-cols-2 rounded-lg border border-slate-200 p-1 text-sm font-semibold">
          <button
            onClick={() => { setMode("password"); setError(null); }}
            className={`rounded-md px-3 py-2 transition-colors ${mode === "password" ? "bg-rotary-royal-blue text-white" : "text-slate-600"}`}
          >
            {t("Нууц үг", "Password", "パスワード", "密码")}
          </button>
          <button
            onClick={() => { setMode("link"); setError(null); }}
            className={`rounded-md px-3 py-2 transition-colors ${mode === "link" ? "bg-rotary-royal-blue text-white" : "text-slate-600"}`}
          >
            {t("И-мэйл холбоос", "Email link", "メールリンク", "邮件链接")}
          </button>
        </div>

        {mode === "link" ? (
          linkSent ? (
            <div className="rounded-xl bg-green-50 border border-green-200 p-6 text-green-800 text-sm">
              {t("Холбоос илгээгдлээ! И-мэйлээ шалгана уу.", "Link sent! Check your email.", "リンクを送信しました!メールをご確認ください。", "链接已发送!请查收邮箱。")}
            </div>
          ) : (
            <form onSubmit={sendLink} className="space-y-4">
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={inputClass} />
              {error && <p className="text-sm text-rotary-cardinal">{error}</p>}
              <button type="submit" disabled={busy} className="w-full bg-rotary-royal-blue text-white font-semibold rounded-md py-2.5 disabled:opacity-60">
                {busy ? t("Илгээж байна…", "Sending…", "送信中…", "发送中…") : t("Холбоос авах", "Send Link", "リンクを送信", "发送链接")}
              </button>
            </form>
          )
        ) : (
          <form onSubmit={loginPassword} className="space-y-4">
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={inputClass} />
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t("Нууц үг", "Password", "パスワード", "密码")} className={inputClass} />
            {error && <p className="text-sm text-rotary-cardinal">{error}</p>}
            <button type="submit" disabled={busy} className="w-full bg-rotary-royal-blue text-white font-semibold rounded-md py-2.5 disabled:opacity-60">
              {busy ? t("Нэвтэрч байна…", "Signing in…", "ログイン中…", "登录中…") : t("Нэвтрэх", "Log In", "ログイン", "登录")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
