// "Our impact" numbers on the home page. Three are counted by the site
// itself (countries and km from the travel map, years since the
// charter); up to IMPACT_MAX more are typed in Admin → Settings and
// stored as JSON in site_settings (key "impact_stats", value_en) — no
// table or migration needed.

export const IMPACT_ICONS = ["person", "school", "clock", "tree", "heart"] as const;
export type ImpactIcon = (typeof IMPACT_ICONS)[number];

export type ImpactStat = { value: string; label_mn: string; label_en: string; icon: ImpactIcon };

export const IMPACT_KEY = "impact_stats";
export const IMPACT_MAX = 3;

// Rows with no number are dropped, so an empty row in Admin hides it.
export function parseImpact(json: string | null | undefined): ImpactStat[] {
  try {
    const rows = JSON.parse(json ?? "[]");
    if (!Array.isArray(rows)) return [];
    return rows
      .map((r) => ({
        value: String(r?.value ?? "").trim(),
        label_mn: String(r?.label_mn ?? "").trim(),
        label_en: String(r?.label_en ?? "").trim(),
        icon: IMPACT_ICONS.includes(r?.icon) ? (r.icon as ImpactIcon) : "person",
      }))
      .filter((r) => r.value)
      .slice(0, IMPACT_MAX);
  } catch {
    return [];
  }
}

// Chartered into Rotary International in June 2012 (club history on
// the About page) — goes up by one every June.
export function yearsOfService(now: Date): number {
  const years = now.getFullYear() - 2012;
  return now.getMonth() >= 5 ? years : years - 1;
}

// For the icon rows: "1,200+" → 1200 people shown as 12 icons of 100.
// Picks the smallest unit (1, 2, 5, 10, 20, 50, …) that keeps a row at
// 20 icons or fewer. null when the value has no number in it.
export function iconRow(value: string): { count: number; unit: number } | null {
  const n = Number(value.replace(/[^\d.]/g, ""));
  if (!Number.isFinite(n) || n <= 0) return null;
  let unit = 1;
  for (let step = 0; n / unit > 20; step++) unit = [2, 5, 10][step % 3] * 10 ** Math.floor(step / 3);
  return { count: Math.max(1, Math.round(n / unit)), unit };
}
