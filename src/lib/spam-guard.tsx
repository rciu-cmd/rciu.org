// Client half of the spam guard on the two public, no-login forms
// (/join, and "Join the Project" on /projects). The real limits live
// in the database (migration26) — a bot can post straight to Supabase
// without ever loading these pages, so nothing here is relied on alone.

type Translate = (mn: string, en: string, ja?: string, zh?: string, ko?: string) => string;

// Matches migration26's check constraints, so a person typing in the
// form can never hit the database's size limit.
export const INQUIRY_MAX_LENGTH = { name: 200, email: 320, phone: 50, message: 5000 } as const;

/**
 * A text field people never see, so only a form-filling bot puts
 * anything in it — the form then pretends to succeed without saving.
 * Pushed off-screen rather than display:none (some bots skip hidden
 * inputs), and kept out of keyboard and screen-reader order. Not named
 * "website"/"url" on purpose: Safari AutoFill can fill those from a
 * real visitor's contact card, which would silently drop a genuine
 * request.
 */
export function HoneypotField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div aria-hidden="true" className="absolute -left-[10000px] w-px h-px overflow-hidden">
      <label>
        Leave this field empty
        <input
          type="text"
          name="rciu_hp"
          tabIndex={-1}
          autoComplete="off"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
    </div>
  );
}

/**
 * Visitor-facing text for migration26's rejections, or null for any
 * other error. The trigger raises "already_sent: …" for the same email
 * within 10 minutes, "rate_limited: …" for too many submissions overall.
 */
export function inquiryLimitMessage(errorMessage: string, t: Translate): string | null {
  if (errorMessage.includes("already_sent")) {
    return t(
      "Энэ и-мэйлээс саяхан хүсэлт ирсэн байна. Бид удахгүй тантай холбогдоно.",
      "We already received a request from this email a few minutes ago. We'll be in touch soon.",
      "このメールアドレスからのお問い合わせは数分前に受け付けました。まもなくご連絡いたします。",
      "我們在幾分鐘前已收到此電子郵件信箱的申請，會盡快與您聯絡。",
      "몇 분 전에 이 이메일로 보낸 요청을 이미 받았습니다. 곧 연락드리겠습니다."
    );
  }
  if (errorMessage.includes("rate_limited")) {
    return t(
      "Одоогоор хэт олон хүсэлт ирж байна. Түр хүлээгээд дахин оролдоно уу.",
      "We're receiving too many requests right now. Please try again a little later.",
      "現在お問い合わせが集中しています。しばらくしてから再度お試しください。",
      "目前申請過多，請稍後再試。",
      "현재 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요."
    );
  }
  return null;
}
