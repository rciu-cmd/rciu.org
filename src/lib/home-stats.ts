// Build-time copy of the three hero numbers on the home page (PHF %,
// sponsored clubs, projects), so they are in the static HTML and show
// the moment the page opens instead of "—" while the browser asks
// Supabase. The page still re-reads them live once it loads, so a
// change since the last build shows up within seconds.
//
// Runs only during `next build`, never in the browser. If Supabase
// can't be reached it logs a warning and returns nulls: the site still
// builds, and the page falls back to loading the numbers live.

import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./supabase-config";

export type HomeStats = { phfPercent: number | null; affiliateCount: number | null; projectCount: number | null };

export const NO_STATS: HomeStats = { phfPercent: null, affiliateCount: null, projectCount: null };

async function rest<T>(query: string): Promise<T[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${query}`, {
    headers: { apikey: SUPABASE_PUBLISHABLE_KEY },
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return (await res.json()) as T[];
}

// Same sums as loadStats() in src/components/HomePage.tsx.
export async function getHomeStats(): Promise<HomeStats> {
  try {
    const [members, affiliates, projects] = await Promise.all([
      rest<{ phf_level: string }>("members_public?select=phf_level"),
      rest<{ id: string }>("affiliate_clubs?select=id"),
      rest<{ id: string }>("projects?select=id"),
    ]);
    return {
      phfPercent: members.length > 0 ? Math.round((members.filter((m) => m.phf_level !== "none").length / members.length) * 100) : null,
      affiliateCount: affiliates.length,
      projectCount: projects.length,
    };
  } catch (err) {
    console.warn(`Home stats: couldn't load from Supabase, the page will load them live (${err})`);
    return NO_STATS;
  }
}
