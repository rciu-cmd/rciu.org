// Shared by the About page's "Where We've Traveled" map and the home
// page's "Our impact" numbers, so both show the same totals.

// Ulaanbaatar — every trip's distance is measured from here.
export const HOME = { lat: 47.9184, lng: 106.9177, label: "Улаанбаатар" };

// Great-circle distance — plain math, no API/key needed.
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// A gently upward-bowing arc between two map points, instead of a
// straight line — reads like a flight path.
export function arcPath(x1: number, y1: number, x2: number, y2: number): string {
  const dist = Math.hypot(x2 - x1, y2 - y1);
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2 - dist * 0.16;
  return `M ${x1} ${y1} Q ${midX} ${midY} ${x2} ${y2}`;
}

// Once around the Earth at the equator.
export const EARTH_KM = 40075;

export type Trip = { destination_country: string; latitude: number; longitude: number };

// Countries visited abroad (trips inside Mongolia don't add a country;
// names are compared case-insensitively, typed in either language) and
// total km from Ulaanbaatar — the same sum the travel map shows.
export function travelTotals(trips: Trip[]): { countries: number; km: number } {
  const countries = new Set(
    trips
      .map((t) => t.destination_country.trim().toLowerCase())
      .filter((c) => c && !c.includes("mongol") && !c.includes("монгол"))
  );
  const km = trips.reduce((sum, t) => sum + haversineKm(HOME.lat, HOME.lng, t.latitude, t.longitude), 0);
  return { countries: countries.size, km };
}
