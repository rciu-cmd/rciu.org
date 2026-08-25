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
  memberName: string | null;
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
      <div className="rounded-xl border border-slate-200 overflow-hidden bg-[#eaf3fb]">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full h-auto">
          <rect width={WIDTH} height={HEIGHT} fill="#eaf3fb" />
          <path d={landPath} fill="#cfe3d4" stroke="#a9c7b3" strokeWidth={0.5} />
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
                  <line
                    x1={home[0]} y1={home[1]} x2={p[0]} y2={p[1]}
                    stroke="#c8102e" strokeWidth={active ? 1.5 : 0.75}
                    strokeDasharray="3 3" opacity={active ? 0.9 : 0.45}
                  />
                  <circle cx={p[0]} cy={p[1]} r={active ? 6 : 4} fill="#c8102e" stroke="white" strokeWidth={1.5} />
                  <title>
                    {tr.destination_city}, {tr.destination_country} — {tr.event_name}
                    {tr.memberName ? ` (${tr.memberName})` : ""} — {Math.round(tr.km).toLocaleString()} km
                  </title>
                </g>
              );
            })}
          {home && (
            <g>
              <circle cx={home[0]} cy={home[1]} r={7} fill="#0a3d91" stroke="white" strokeWidth={2} />
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
              className={`flex items-center justify-between gap-4 px-4 py-2.5 text-sm ${hoverId === tr.id ? "bg-blue-50" : ""}`}
            >
              <div>
                <p className="font-semibold text-slate-900">{tr.destination_city}, {tr.destination_country}</p>
                <p className="text-xs text-slate-500">
                  {tr.event_name}
                  {tr.memberName && ` · ${tr.memberName}`}
                  {tr.event_date && ` · ${tr.event_date}`}
                </p>
              </div>
              <span className="text-xs font-semibold text-rotary-azure shrink-0">
                {Math.round(tr.km).toLocaleString()} km
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
