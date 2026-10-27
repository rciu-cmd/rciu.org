import type { CSSProperties } from "react";

// Sparks of light drifting slowly up behind the hero text — small gold
// and white dots, each on its own loop, swaying a little side to side.
// Fixed positions and timings (no randomness), so the page built at
// build time and the one in the browser agree; negative delays start
// each spark part-way up, so the hero never looks empty while the first
// ones climb. Purely decorative and hidden for reduced motion
// (globals.css, .spark-track). Sits under the hero's text (-z-10 inside
// its z-10 wrapper) and spans the full screen width — the hero section
// clips the sideways overflow (overflow-x-clip).
const GOLD = "#f7a81b";
const WHITE = "#ffffff";

const SPARKS: { left: number; size: number; rise: number; delay: number; sway: number; color: string; opacity: number }[] = [
  { left: 3, size: 5, rise: 16, delay: -3, sway: 3.4, color: GOLD, opacity: 0.85 },
  { left: 10, size: 4, rise: 20, delay: -11, sway: 4.1, color: WHITE, opacity: 0.65 },
  { left: 17, size: 8, rise: 18, delay: -7, sway: 5, color: GOLD, opacity: 0.7 },
  { left: 25, size: 4, rise: 14, delay: -1, sway: 3, color: WHITE, opacity: 0.75 },
  { left: 33, size: 6, rise: 22, delay: -15, sway: 4.6, color: GOLD, opacity: 0.65 },
  { left: 41, size: 4, rise: 17, delay: -9, sway: 3.7, color: WHITE, opacity: 0.6 },
  { left: 49, size: 5, rise: 19, delay: -4, sway: 4.4, color: GOLD, opacity: 0.8 },
  { left: 57, size: 9, rise: 24, delay: -18, sway: 5.4, color: WHITE, opacity: 0.45 },
  { left: 64, size: 4, rise: 15, delay: -6, sway: 3.2, color: GOLD, opacity: 0.85 },
  { left: 71, size: 6, rise: 21, delay: -13, sway: 4.8, color: WHITE, opacity: 0.6 },
  { left: 78, size: 5, rise: 16, delay: -10, sway: 3.9, color: GOLD, opacity: 0.75 },
  { left: 85, size: 4, rise: 18, delay: -2, sway: 4.2, color: WHITE, opacity: 0.7 },
  { left: 92, size: 8, rise: 23, delay: -16, sway: 5.1, color: GOLD, opacity: 0.65 },
  { left: 97, size: 4, rise: 17, delay: -8, sway: 3.5, color: WHITE, opacity: 0.65 },
];

export default function HeroSparks() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-1/2 w-screen -translate-x-1/2 -z-10 overflow-hidden">
      {SPARKS.map((s, i) => (
        <span
          key={i}
          className="spark-track absolute inset-0"
          style={{ animationDuration: `${s.rise}s`, animationDelay: `${s.delay}s`, "--spark-opacity": s.opacity } as CSSProperties}
        >
          <span
            className="spark absolute top-0 rounded-full"
            style={{
              left: `${s.left}%`,
              width: s.size,
              height: s.size,
              background: s.color,
              boxShadow: `0 0 ${s.size * 2}px ${s.color}`,
              animationDuration: `${s.sway}s`,
            }}
          />
        </span>
      ))}
    </div>
  );
}
