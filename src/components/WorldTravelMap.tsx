"use client";

import { useMemo, useState } from "react";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
// eslint-disable-next-line @typescript-eslint/no-var-requires
import landTopology from "world-atlas/land-110m.json";

// Ulaanbaatar — every trip's distance/line is measured from here.
const HOME = { lat: 47.9184, lng: 106.9177, label: "Улаанбаатар" };

export type TravelPoint = {
  id: string;
  event_name: string;
  destination_city: string;
  destination_country: string;
  latitude: number;
  longitude: number;
  event_date: string | null;
  memberNames: string[];
};

// Great-circle distance — plain math, no API/key needed.
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// A gently upward-bowing arc between two points, instead of a straight
// line — reads much more like an actual flight path on a map.
function arcPath(x1: number, y1: number, x2: number, y2: number): string {
  const dist = Math.hypot(x2 - x1, y2 - y1);
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2 - dist * 0.16;
  return `M ${x1} ${y1} Q ${midX} ${midY} ${x2} ${y2}`;
}

const WIDTH = 960;
const HEIGHT = 500;

export default function WorldTravelMap({
  travels,
  t,
}: {
  travels: TravelPoint[];
  t: (mn: string, en: string, ja?: string, zh?: string) => string;
}) {
  const [hoverId, setHoverId] = useState<string | null>(null);

  const { landPath, project } = useMemo(() => {
    const projection = geoNaturalEarth1().fitSize(
      [WIDTH, HEIGHT],
      feature(landTopology as unknown as Topology, landTopology.objects.land as GeometryCollection)
    );
    const pathGen = geoPath(projection);
    const landGeo = feature(landTopology as unknown as Topology, landTopology.objects.land as GeometryCollection);
    return {
      landPath: pathGen(landGeo) ?? "",
      project: (lon: number, lat: number) => projection([lon, lat]) as [number, number] | null,
    };
  }, []);

  const home = project(HOME.lng, HOME.lat);

  const withDistance = travels
    .map((tr) => ({ ...tr, km: haversineKm(HOME.lat, HOME.lng, tr.latitude, tr.longitude) }))
    .sort((a, b) => b.km - a.km);

  const totalKm = withDistance.reduce((sum, tr) => sum + tr.km, 0);

  return (
    <div>
      <div className="rounded-2xl overflow-hidden shadow-lg ring-1 ring-black/5">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full h-auto block">
          <defs>
            <radialGradient id="rciu-ocean" cx="50%" cy="35%" r="75%">
              <stop offset="0%" stopColor="#173a63" />
              <stop offset="55%" stopColor="#0e2a4a" />
              <stop offset="100%" stopColor="#081a30" />
            </radialGradient>
            <linearGradient id="rciu-land" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3f6f5c" />
              <stop offset="100%" stopColor="#2c5245" />
            </linearGradient>
            <linearGradient id="rciu-arc" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#f7a81b" stopOpacity="0.15" />
              <stop offset="50%" stopColor="#f7a81b" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#f7a81b" stopOpacity="0.15" />
            </linearGradient>
            <filter id="rciu-pin-glow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <rect width={WIDTH} height={HEIGHT} fill="url(#rciu-ocean)" />
          {/* Faint graticule for a bit of "real map" texture. */}
          {Array.from({ length: 7 }, (_, i) => (i + 1) * (HEIGHT / 8)).map((y) => (
            <line key={`h${y}`} x1={0} y1={y} x2={WIDTH} y2={y} stroke="#ffffff" strokeOpacity={0.03} />
          ))}
          {Array.from({ length: 11 }, (_, i) => (i + 1) * (WIDTH / 12)).map((x) => (
            <line key={`v${x}`} x1={x} y1={0} x2={x} y2={HEIGHT} stroke="#ffffff" strokeOpacity={0.03} />
          ))}
          <path d={landPath} fill="url(#rciu-land)" stroke="#1d3b30" strokeWidth={0.6} />

          {home &&
            withDistance.map((tr) => {
              const p = project(tr.longitude, tr.latitude);
              if (!p) return null;
              const active = hoverId === tr.id;
              return (
                <g
                  key={tr.id}
                  onMouseEnter={() => setHoverId(tr.id)}
                  onMouseLeave={() => setHoverId(null)}
                  className="cursor-pointer"
                >
                  <path
                    d={arcPath(home[0], home[1], p[0], p[1])}
                    fill="none"
                    stroke="url(#rciu-arc)"
                    strokeWidth={active ? 2 : 1}
                    strokeDasharray={active ? undefined : "1 4"}
                    strokeLinecap="round"
                    opacity={active ? 1 : 0.7}
                  />
                  <circle
                    cx={p[0]}
                    cy={p[1]}
                    r={active ? 7 : 4.5}
                    fill="#f7a81b"
                    stroke="#fff"
                    strokeWidth={1.5}
                    filter={active ? "url(#rciu-pin-glow)" : undefined}
                  />
                  <title>
                    {tr.destination_city}, {tr.destination_country} — {tr.event_name}
                    {tr.memberNames.length > 0 ? ` (${tr.memberNames.join(", ")})` : ""} — {Math.round(tr.km).toLocaleString()} km
                  </title>
                </g>
              );
            })}
          {home && (
            <g>
              <circle cx={home[0]} cy={home[1]} r={9} fill="none" stroke="#f7a81b" strokeWidth={1.5} opacity={0.6} className="animate-ping origin-center" style={{ transformOrigin: `${home[0]}px ${home[1]}px` }} />
              <circle cx={home[0]} cy={home[1]} r={7} fill="#0a3d91" stroke="#fff" strokeWidth={2} />
              <circle cx={home[0]} cy={home[1]} r={2.5} fill="#f7a81b" />
              <title>{HOME.label} — Rotary Club of Ikh Urgoo</title>
            </g>
          )}
        </svg>
      </div>

      <p className="text-sm text-slate-500 mt-4">
        {t(
          `Клубын гишүүд нийт ойролцоогоор ${Math.round(totalKm).toLocaleString()} км (${Math.round(totalKm * 0.621371).toLocaleString()} миль) аялсан байна.`,
          `Club members have collectively traveled roughly ${Math.round(totalKm).toLocaleString()} km (${Math.round(totalKm * 0.621371).toLocaleString()} miles).`,
          `クラブ会員は合計約${Math.round(totalKm).toLocaleString()}km(${Math.round(totalKm * 0.621371).toLocaleString()}マイル)移動しました。`,
          `俱乐部会员总共旅行了约 ${Math.round(totalKm).toLocaleString()} 公里(${Math.round(totalKm * 0.621371).toLocaleString()} 英里)。`
        )}
      </p>

      {withDistance.length > 0 && (
        <div className="mt-4 rounded-xl border border-slate-200 divide-y divide-slate-100 max-h-80 overflow-y-auto">
          {withDistance.map((tr) => (
            <div
              key={tr.id}
              onMouseEnter={() => setHoverId(tr.id)}
              onMouseLeave={() => setHoverId(null)}
              className={`flex items-center justify-between gap-4 px-4 py-2.5 text-sm transition-colors ${hoverId === tr.id ? "bg-amber-50" : ""}`}
            >
              <div className="min-w-0">
                <p className="font-semibold text-slate-900">{tr.destination_city}, {tr.destination_country}</p>
                <p className="text-xs text-slate-500 truncate">
                  {tr.event_name}
                  {tr.memberNames.length > 0 && ` · ${tr.memberNames.join(", ")}`}
                  {tr.event_date && ` · ${tr.event_date}`}
                </p>
              </div>
              <span className="text-xs font-semibold text-rotary-gold shrink-0">
                {Math.round(tr.km).toLocaleString()} km
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
