import type { Translate } from "./language-context";

// Board titles are typed in Admin in Mongolian and English only. For the
// standard Rotary club titles, Japanese / Chinese / Korean come from
// this list, matched on the English title — upper/lower case and a
// leading "Club" or "Rotary" don't matter ("Club Secretary" = "Secretary").
// A date in brackets after the title — "(through 1 Jul 2026)",
// "(from 12 Jul 2026)" — is kept and written each language's way.
// Any other title shows in English, as before. (Hong Kong gets the
// Chinese through toHongKong(), like every other text.)
type Titles = { ja: string; zh: string; ko: string };

const TITLES: Record<string, Titles> = {
  "president": { ja: "会長", zh: "社長", ko: "회장" },
  "president-elect": { ja: "会長エレクト", zh: "社長當選人", ko: "차기 회장" },
  "vice president": { ja: "副会長", zh: "副社長", ko: "부회장" },
  "secretary": { ja: "幹事", zh: "秘書", ko: "총무" },
  "treasurer": { ja: "会計", zh: "財務", ko: "재무" },
  "executive secretary": { ja: "事務局長", zh: "執行秘書", ko: "사무국장" },
  "executive secretary/director": { ja: "事務局長", zh: "執行秘書／執行長", ko: "사무국장" },
  "foundation chair": { ja: "ロータリー財団委員長", zh: "扶輪基金主委", ko: "로타리재단 위원장" },
  "membership chair": { ja: "会員増強委員長", zh: "社員主委", ko: "회원 위원장" },
  "public image chair": { ja: "公共イメージ委員長", zh: "公共形象主委", ko: "공공이미지 위원장" },
  "service projects chair": { ja: "奉仕プロジェクト委員長", zh: "服務計畫主委", ko: "봉사 프로젝트 위원장" },
  "learning facilitator": { ja: "クラブ研修リーダー", zh: "社內研習負責人", ko: "클럽 연수 담당" },
  "young leaders contact": { ja: "若手リーダー担当", zh: "青年領袖聯絡人", ko: "청년 리더 담당" },
};

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

// "(through 1 Jul 2026)" → kind + date, or null for anything else.
function parseDateNote(note: string): { kind: "until" | "from"; y: number; m: number; d: number } | null {
  const hit = /^(through|until|till|to|from|since)\s+(\d{1,2})\s+([a-z]+)\.?,?\s+(\d{4})$/i.exec(note.trim());
  if (!hit) return null;
  const m = MONTHS.indexOf(hit[3].slice(0, 3).toLowerCase()) + 1;
  if (m === 0) return null;
  const kind = /^(from|since)$/i.test(hit[1]) ? "from" : "until";
  return { kind, y: Number(hit[4]), m, d: Number(hit[2]) };
}

function builtInTitle(roleEn: string): Titles | null {
  const hit = /^(.*?)\s*(?:\(([^()]*)\))?\s*$/.exec(roleEn);
  if (!hit) return null;
  const key = hit[1]
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/^(club |the rotary |rotary )+/, "");
  const title = TITLES[key];
  if (!title) return null;
  if (!hit[2]) return title;
  const date = parseDateNote(hit[2]);
  if (!date) return null;
  const { kind, y, m, d } = date;
  return kind === "until"
    ? { ja: `${title.ja}（${y}年${m}月${d}日まで）`, zh: `${title.zh}（至${y}年${m}月${d}日）`, ko: `${title.ko} (${y}년 ${m}월 ${d}일까지)` }
    : { ja: `${title.ja}（${y}年${m}月${d}日から）`, zh: `${title.zh}（${y}年${m}月${d}日起）`, ko: `${title.ko} (${y}년 ${m}월 ${d}일부터)` };
}

// A board title in the visitor's language. Japanese / Chinese typed into
// the database (role_ja / role_zh) win over the built-in list.
export function boardRoleTitle(
  t: Translate,
  r: { role_mn: string; role_en: string; role_ja?: string | null; role_zh?: string | null }
): string {
  const built = builtInTitle(r.role_en);
  return t(r.role_mn, r.role_en, r.role_ja || built?.ja, r.role_zh || built?.zh, built?.ko);
}
