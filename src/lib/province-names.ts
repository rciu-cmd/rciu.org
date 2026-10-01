import type { Translate } from "./language-context";
import type { Province } from "./mongolia-provinces";

// Japanese / Chinese / Korean names of Mongolia's provinces, by the id in
// src/lib/mongolia-provinces.ts (that file is generated, so the extra
// names live here). Japanese and Chinese use their usual forms (…県, …省;
// Chinese Traditional); Korean is the name alone, like MN/EN.
const NAMES: Record<string, { ja: string; zh: string; ko: string }> = {
  "arkhangai": { ja: "アルハンガイ県", zh: "後杭愛省", ko: "아르항가이" },
  "bayan-ulgii": { ja: "バヤン・ウルギー県", zh: "巴彥烏列蓋省", ko: "바양울기" },
  "bayankhongor": { ja: "バヤンホンゴル県", zh: "巴彥洪戈爾省", ko: "바양헝거르" },
  "bulgan": { ja: "ボルガン県", zh: "布爾干省", ko: "불강" },
  "govi-altai": { ja: "ゴビ・アルタイ県", zh: "戈壁阿爾泰省", ko: "고비알타이" },
  "govisumber": { ja: "ゴビスンベル県", zh: "戈壁蘇木貝爾省", ko: "고비숨베르" },
  "darkhan-uul": { ja: "ダルハン・オール県", zh: "達爾汗烏勒省", ko: "다르항올" },
  "dornogovi": { ja: "ドルノゴビ県", zh: "東戈壁省", ko: "도르노고비" },
  "dornod": { ja: "ドルノド県", zh: "東方省", ko: "도르노드" },
  "dundgovi": { ja: "ドンドゴビ県", zh: "中戈壁省", ko: "돈드고비" },
  "zavkhan": { ja: "ザブハン県", zh: "扎布汗省", ko: "자브항" },
  "orkhon": { ja: "オルホン県", zh: "鄂爾渾省", ko: "오르홍" },
  "uvurkhangai": { ja: "ウブルハンガイ県", zh: "前杭愛省", ko: "우부르항가이" },
  "umnugovi": { ja: "ウムヌゴビ県", zh: "南戈壁省", ko: "남고비" },
  "sukhbaatar": { ja: "スフバートル県", zh: "蘇赫巴托省", ko: "수흐바타르" },
  "selenge": { ja: "セレンゲ県", zh: "色楞格省", ko: "셀렝게" },
  "tuv": { ja: "トゥブ県", zh: "中央省", ko: "투브" },
  "uvs": { ja: "オブス県", zh: "烏布蘇省", ko: "옵스" },
  "ulaanbaatar": { ja: "ウランバートル", zh: "烏蘭巴托", ko: "울란바토르" },
  "khovd": { ja: "ホブド県", zh: "科布多省", ko: "호브드" },
  "khuvsgul": { ja: "フブスグル県", zh: "庫蘇古爾省", ko: "홉스골" },
  "khentii": { ja: "ヘンティー県", zh: "肯特省", ko: "헨티" },
};

export function provinceName(t: Translate, p: Province): string {
  const n = NAMES[p.id];
  return t(p.mn, p.en, n?.ja, n?.zh, n?.ko);
}
