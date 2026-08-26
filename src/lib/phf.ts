// Paul Harris Fellow tier → visual theme, shared by the member
// dashboard (private, self-view) and the public honor roll.
//
// Sapphire pins for PHF+1..PHF+5, ruby pins for PHF+6..PHF+8, per
// Rotary Foundation's official recognition-level guide.

export type PhfLevel =
  | "none" | "PHF" | "PHF+1" | "PHF+2" | "PHF+3" | "PHF+4"
  | "PHF+5" | "PHF+6" | "PHF+7" | "PHF+8";

export interface PhfTheme {
  label: string;
  gem: "none" | "sapphire" | "ruby";
  gemCount: number;
  accent: string;   // hex, used for borders/badges
  gradient: string; // CSS gradient for dashboard header background
}

const SAPPHIRE = "#1D4E89";
const RUBY = "#9B111E";

// Major Donor recognition sits above the regular PHF gem scale (it's
// awarded independently of PHF level, per the Rotary Foundation), so
// it gets its own theme rather than reusing whichever PHF+N color the
// member happens to also hold — platinum/diamond, matching the
// diamond-shaped Major Donor pin image already in use.
export const MAJOR_DONOR_THEME: PhfTheme = {
  label: "Major Donor",
  gem: "none",
  gemCount: 0,
  accent: "#4A5568",
  gradient: "linear-gradient(135deg,#B0B8C4,#4A5568)",
};

export const PHF_THEMES: Record<PhfLevel, PhfTheme> = {
  none: { label: "", gem: "none", gemCount: 0, accent: "#94A3B8", gradient: "linear-gradient(135deg,#64748B,#334155)" },
  PHF: { label: "Paul Harris Fellow", gem: "none", gemCount: 0, accent: "#B08D57", gradient: "linear-gradient(135deg,#D4AF6A,#8A6D3B)" },
  "PHF+1": { label: "Paul Harris Fellow +1", gem: "sapphire", gemCount: 1, accent: SAPPHIRE, gradient: "linear-gradient(135deg,#2E6DA4,#173A5E)" },
  "PHF+2": { label: "Paul Harris Fellow +2", gem: "sapphire", gemCount: 2, accent: SAPPHIRE, gradient: "linear-gradient(135deg,#2E6DA4,#173A5E)" },
  "PHF+3": { label: "Paul Harris Fellow +3", gem: "sapphire", gemCount: 3, accent: SAPPHIRE, gradient: "linear-gradient(135deg,#2E6DA4,#173A5E)" },
  "PHF+4": { label: "Paul Harris Fellow +4", gem: "sapphire", gemCount: 4, accent: SAPPHIRE, gradient: "linear-gradient(135deg,#2E6DA4,#173A5E)" },
  "PHF+5": { label: "Paul Harris Fellow +5", gem: "sapphire", gemCount: 5, accent: SAPPHIRE, gradient: "linear-gradient(135deg,#2E6DA4,#173A5E)" },
  "PHF+6": { label: "Paul Harris Fellow +6", gem: "ruby", gemCount: 1, accent: RUBY, gradient: "linear-gradient(135deg,#C0263B,#5E1019)" },
  "PHF+7": { label: "Paul Harris Fellow +7", gem: "ruby", gemCount: 2, accent: RUBY, gradient: "linear-gradient(135deg,#C0263B,#5E1019)" },
  "PHF+8": { label: "Paul Harris Fellow +8", gem: "ruby", gemCount: 3, accent: RUBY, gradient: "linear-gradient(135deg,#C0263B,#5E1019)" },
};

export function phfTheme(level: string | null | undefined): PhfTheme {
  return PHF_THEMES[(level as PhfLevel) || "none"] ?? PHF_THEMES.none;
}

// The theme to actually display for a member: Major Donor status
// overrides whatever PHF level they also hold — a Major Donor who is
// also PHF+8 shows only "Major Donor" (platinum), never "PHF+8"
// (ruby), everywhere a PHF theme/label is rendered.
export function effectiveTheme(level: string | null | undefined, majorDonor: boolean | null | undefined): PhfTheme {
  return majorDonor ? MAJOR_DONOR_THEME : phfTheme(level);
}
