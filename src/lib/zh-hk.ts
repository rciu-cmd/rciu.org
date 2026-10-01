// Hong Kong Chinese (🇭🇰) is the site's Traditional Chinese (🇹🇼,
// written the Taiwan way) with Hong Kong wording swapped in, so no t()
// call needs a sixth argument. Same characters; only the words below
// differ. Hong Kong and Macau browsers get this version automatically
// (language-context.tsx).
//
// Whole texts that read differently in Hong Kong — keyed by the exact
// Taiwan text passed to t(). If that text is ever edited, update the
// key here too, or Hong Kong visitors see the Taiwan wording (still
// readable, just not local).
const WHOLE: Record<string, string> = {
  // Donate window (bank details): Hong Kong says 戶口 / 轉賬.
  "銀行帳戶資訊": "銀行戶口資料",
  "戶名": "戶口名稱",
  "帳號": "戶口號碼",
  "幣別": "貨幣",
  "您可以直接轉帳至以下本社帳戶進行捐款。": "您可以直接轉賬至以下本社銀行戶口捐款。",
  // Event category.
  "國定假日": "公眾假期",
  // Forms.
  "送出": "提交",
  "傳送中…": "提交中…",
  "發生錯誤，請再試一次。如果問題持續，請寄信至 contact@rciu.org。":
    "發生錯誤，請再試一次。如果問題持續，請電郵至 contact@rciu.org。",
};

// Words that are always written differently in Hong Kong, wherever they
// appear. Only words with no other meaning belong here — e.g. not 帳戶,
// which is 戶口 for a bank account but stays 帳戶 for a login account.
// Longer phrases first.
const WORDS: [string, string][] = [
  ["電子郵件信箱", "電郵地址"],
  ["電子郵件", "電郵"],
  ["計畫", "計劃"],
  ["網路", "網絡"],
  ["線上", "網上"],
];

export function toHongKong(zh: string): string {
  const whole = WHOLE[zh];
  if (whole) return whole;
  let s = zh;
  for (const [tw, hk] of WORDS) s = s.split(tw).join(hk);
  return s;
}
