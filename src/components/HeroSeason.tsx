"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { startWeather, type Season } from "@/lib/weather";

// The season's weather behind the hero text, by the season in
// Ulaanbaatar: snow in winter (Dec–Feb), blossom petals in spring
// (Mar–May), rain in summer (Jun–Aug), falling leaves in autumn
// (Sep–Nov). The season is read in the visitor's browser, not at build
// time, so it changes on the right day even if the site isn't rebuilt;
// the static HTML has no weather and it fades in once the page and the
// season's photos have loaded. How it's drawn: src/lib/weather.ts.
// Purely decorative and off for reduced motion (here, and
// .season-canvas in globals.css). Sits under the hero's text (-z-10
// inside its z-10 wrapper) and spans the full screen width — the hero
// section clips the sideways overflow (overflow-x-clip).

export type { Season };

// Ulaanbaatar is UTC+8 all year (no daylight saving since 2017).
function currentSeason(): Season {
  const month = new Date(Date.now() + 8 * 60 * 60 * 1000).getUTCMonth(); // 0 = January
  if (month >= 2 && month <= 4) return "spring";
  if (month >= 5 && month <= 7) return "summer";
  if (month >= 8 && month <= 10) return "autumn";
  return "winter";
}

const noSubscription = () => () => {};

export function SeasonWeather({ season }: { season: Season }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!canvas.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    return startWeather(canvas.current, season);
  }, [season]);
  return (
    <canvas
      ref={canvas}
      aria-hidden="true"
      className="season-canvas pointer-events-none absolute inset-y-0 left-1/2 -z-10 h-full w-screen -translate-x-1/2 opacity-0 transition-opacity duration-1000"
    />
  );
}

export default function HeroSeason() {
  // null while the page is built and on its first render in the
  // browser (so both match), then the season from the visitor's clock.
  const season = useSyncExternalStore(noSubscription, currentSeason, () => null);
  return season && <SeasonWeather season={season} />;
}
