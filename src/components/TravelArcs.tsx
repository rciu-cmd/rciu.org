"use client";

import { useMemo } from "react";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import landTopology from "world-atlas/land-110m.json";
import { HOME, arcPath, type Trip } from "@/lib/travel";

// Small, decorative version of the About page's travel map for the home
// page's "Our impact" panel: land, and a gold flight line from
// Ulaanbaatar to each place visited. The lines draw themselves once the
// panel scrolls into view (.impact-arc in globals.css). Loaded on demand
// (next/dynamic) so the map data isn't in the home page's first load.
const W = 960;
const H = 470;

export default function TravelArcs({ trips }: { trips: Trip[] }) {
  const { land, project } = useMemo(() => {
    const geo = feature(landTopology as unknown as Topology, landTopology.objects.land as GeometryCollection);
    const projection = geoNaturalEarth1().fitSize([W, H], geo);
    return {
      land: geoPath(projection)(geo) ?? "",
      project: (lon: number, lat: number) => projection([lon, lat]) as [number, number] | null,
    };
  }, []);

  const home = project(HOME.lng, HOME.lat);
  // One line per place, however many trips went there.
  const places = [...new Map(trips.map((t) => [`${t.latitude.toFixed(1)},${t.longitude.toFixed(1)}`, t])).values()];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block" role="img" aria-hidden="true">
      <path d={land} fill="#ffffff" fillOpacity={0.13} />
      {home &&
        places.map((p, i) => {
          const to = project(p.longitude, p.latitude);
          if (!to) return null;
          return (
            <g key={i}>
              <path
                d={arcPath(home[0], home[1], to[0], to[1])}
                pathLength={1}
                fill="none"
                stroke="#f7a81b"
                strokeWidth={2.5}
                strokeLinecap="round"
                className="impact-arc"
                style={{ transitionDelay: `${i * 0.18}s` }}
              />
              <circle cx={to[0]} cy={to[1]} r={7} fill="#f7a81b" className="impact-pin" style={{ transitionDelay: `${i * 0.18 + 1}s` }} />
            </g>
          );
        })}
      {home && (
        <>
          <circle cx={home[0]} cy={home[1]} r={14} fill="#ffffff" fillOpacity={0.25} />
          <circle cx={home[0]} cy={home[1]} r={7} fill="#ffffff" />
        </>
      )}
    </svg>
  );
}
