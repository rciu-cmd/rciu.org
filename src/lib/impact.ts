// "Our impact" numbers on the home page. Three are counted by the site
// itself (countries and km from the travel map, years since the
// charter); up to IMPACT_MAX more are typed in Admin → Settings and
// stored as JSON in site_settings (key "impact_stats", value_en) — no
// table or migration needed.

export type ImpactStat = { value: string; label_mn: string; label_en: string };

export const IMPACT_KEY = "impact_stats";
export const IMPACT_MAX = 3;

// Rows with no number are dropped, so an empty row in Admin hides it.
export function parseImpact(json: string | null | undefined): ImpactStat[] {
  try {
    const rows = JSON.parse(json ?? "[]");
    if (!Array.isArray(rows)) return [];
    return rows
      .map((r) => ({ value: String(r?.value ?? "").trim(), label_mn: String(r?.label_mn ?? "").trim(), label_en: String(r?.label_en ?? "").trim() }))
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
