"use client";

import Image from "next/image";
import Link from "next/link";
import { asset } from "@/lib/asset";
import { useLanguage } from "@/lib/language-context";

export default function Home() {
  const { t } = useLanguage();

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-rotary-royal-blue to-[#0d2c5c] text-white">
        <div className="container-page py-16 sm:py-24 grid gap-10 sm:grid-cols-2 items-center">
          <div>
            <p className="text-rotary-gold font-semibold tracking-wide uppercase text-sm mb-3">
              {t("Rotary олон улсын гишүүн клуб", "A member club of Rotary International", "ロータリー・インターナショナル会員クラブ", "国际扶轮会员俱乐部")}
            </p>
            <h1 className="text-3xl sm:text-5xl font-extrabold leading-tight mb-5">
              Rotary Club of Ikh Urgoo
            </h1>
            <p className="text-blue-100 text-lg mb-8 max-w-md">
              {t(
                "Улаанбаатар хотод үйлчилдэг, дэлхийн Rotary олон улсын гэр бүлийн нэг хэсэг болсон клуб.",
                "Serving Ulaanbaatar as part of the worldwide Rotary family — connecting people to take action and create lasting change.",
                "ウランバートルで奉仕する、世界的なロータリーファミリーの一員です。",
                "服务于乌兰巴托,是全球扶轮大家庭的一员。"
              )}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/about" className="bg-rotary-gold text-[#5a3d0a] font-bold px-6 py-3 rounded-full hover:brightness-105 transition">
                {t("Бидний тухай", "Learn About Us", "詳細はこちら", "了解我们")}
              </Link>
              <Link href="/contact" className="border border-white/40 text-white font-semibold px-6 py-3 rounded-full hover:bg-white/10 transition">
                {t("Хуралд оролцох", "Join a Meeting", "例会に参加する", "参加例会")}
              </Link>
            </div>
          </div>
          <div className="flex justify-center">
            <Image
              src={asset("/logos/rciu-emblem.jpg")}
              alt="Rotary Club of Ikh Urgoo emblem"
              width={280}
              height={280}
              className="rounded-full shadow-2xl bg-white p-3"
              priority
            />
          </div>
        </div>
      </section>

      {/* Quick stats */}
      <section className="container-page py-14 grid gap-6 sm:grid-cols-3">
        <StatCard
          value="16"
          label={t("Идэвхтэй гишүүн", "Active members", "アクティブ会員", "活跃会员")}
        />
        <StatCard
          value="100%"
          label={t("Paul Harris Fellow", "Paul Harris Fellows", "ポール・ハリス・フェロー", "保罗·哈里斯会员")}
        />
        <StatCard
          value="2"
          label={t("Дэмждэг клуб (Interact, Rotaract)", "Sponsored clubs (Interact & Rotaract)", "スポンサークラブ", "赞助俱乐部")}
        />
      </section>

      {/* About teaser */}
      <section className="bg-slate-50 py-14">
        <div className="container-page grid gap-10 sm:grid-cols-2 items-center">
          <div>
            <h2 className="text-2xl font-bold text-rotary-royal-blue mb-4">
              {t("Бид хэн бэ", "Who We Are", "私たちについて", "我们是谁")}
            </h2>
            <p className="text-slate-600 mb-4">
              {t(
                "Rotary Club of Ikh Urgoo нь албан ёсоор дүрэмт клубын гэрчилгээ авсан, Rotary International-ийн 3450-р дүүрэгт харьяалагдах клуб юм.",
                "Rotary Club of Ikh Urgoo is an officially chartered member club of Rotary International, part of District 3450.",
                "イクー・ウルグー・ロータリークラブは、ロータリー・インターナショナルの正式に認可されたクラブで、地区3450に所属しています。",
                "扶轮伊赫乌尔古俱乐部是国际扶轮正式注册的会员俱乐部,隶属于3450区。"
              )}
            </p>
            <Link href="/about" className="text-rotary-royal-blue font-semibold hover:underline">
              {t("Дэлгэрэнгүй →", "Read more →", "詳細を見る →", "查看更多 →")}
            </Link>
          </div>
          <div className="flex gap-6 items-center justify-center flex-wrap">
            <Image src={asset("/logos/ri-gear-logo.png")} alt="Rotary International" width={110} height={110} />
            <Image src={asset("/logos/district-3450-logo.png")} alt="Rotary District 3450" width={160} height={80} />
          </div>
        </div>
      </section>

      {/* Meeting info */}
      <section className="container-page py-14 grid gap-6 sm:grid-cols-2">
        <InfoCard
          title={t("Ирж уулзацгаая", "Come to a Meeting", "例会にお越しください", "欢迎参加例会")}
          body={t(
            "Мягмар гараг бүр 20:00 цагт, Red Rock Castle рестораны танхимд.",
            "Every Tuesday at 20:00, at Red Rock Castle Restaurant.",
            "毎週火曜日 20:00、Red Rock Castle レストランにて。",
            "每周二 20:00,在 Red Rock Castle 餐厅举行。"
          )}
        />
        <InfoCard
          title={t("Онлайнаар нэгдэх", "Join Online", "オンラインで参加", "在线参加")}
          body={t(
            "Google Meet-ээр хол байгаа гишүүд, зочид нэгдэх боломжтой.",
            "Distant members and guests can join via Google Meet.",
            "遠方の会員やゲストはGoogle Meetでご参加いただけます。",
            "远方会员及嘉宾可通过 Google Meet 参加。"
          )}
        />
      </section>
    </div>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border border-slate-200 p-6 text-center shadow-sm">
      <div className="text-4xl font-extrabold text-rotary-royal-blue mb-1">{value}</div>
      <div className="text-slate-500 text-sm">{label}</div>
    </div>
  );
}

function InfoCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl bg-white border border-slate-200 p-6 shadow-sm">
      <h3 className="font-bold text-rotary-royal-blue mb-2">{title}</h3>
      <p className="text-slate-600 text-sm">{body}</p>
    </div>
  );
}
