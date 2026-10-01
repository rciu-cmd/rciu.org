"use client";

import { useEffect, useRef, useState } from "react";
import { asset } from "@/lib/asset";

// Gear colours per section — the official Rotary palette
// (brandcenter.rotary.org), picked to look clearly different from one
// section to the next. Each home page section picks one with
// data-gear="…"; opacity is higher on the dark hero so the gold reads
// as clearly there as the others do on the light sections.
const TONES: Record<string, { color: string; opacity: number }> = {
  gold: { color: "#f7a81b", opacity: 0.14 },
  cranberry: { color: "#d41367", opacity: 0.08 },
  royal: { color: "#17458f", opacity: 0.08 },
  turquoise: { color: "#00adbb", opacity: 0.13 },
  sky: { color: "#00a2e0", opacity: 0.1 },
};

// The home page's one slow-spinning Rotary wheel. It stays in the
// top-right corner while the page scrolls and changes colour to match
// whichever section (any element with data-gear, the footer included)
// is under its centre. It's the gear's outline used as a CSS mask over
// a plain colour, so a colour change is a smooth fade of one element —
// never two gears on screen. Purely decorative; it sits under each
// section's content (which is z-10), so it never covers text.
export default function HomeGear() {
  const ref = useRef<HTMLDivElement>(null);
  const [tone, setTone] = useState("gold");

  useEffect(() => {
    let frame = 0;
    function update() {
      frame = 0;
      const box = ref.current?.getBoundingClientRect();
      if (!box) return;
      const y = box.top + box.height / 2;
      for (const section of document.querySelectorAll<HTMLElement>("[data-gear]")) {
        const r = section.getBoundingClientRect();
        if (r.top <= y && y < r.bottom) {
          setTone(section.dataset.gear ?? "gold");
          return;
        }
      }
    }
    function schedule() {
      if (!frame) frame = requestAnimationFrame(update);
    }
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    // Sections grow as their content loads, which can move a boundary
    // past the gear without any scrolling.
    const resize = new ResizeObserver(schedule);
    resize.observe(document.body);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      resize.disconnect();
    };
  }, []);

  const { color, opacity } = TONES[tone] ?? TONES.gold;
  const mask = `url(${asset("/logos/ri-gear-gold.png")}) center / contain no-repeat`;

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none select-none fixed z-0 -right-24 top-4 w-80 h-80 sm:-right-32 sm:-top-8 sm:w-[620px] sm:h-[620px]"
    >
      <div
        className="w-full h-full animate-spin-slow transition-[background-color,opacity] duration-700 ease-out"
        style={{ backgroundColor: color, opacity, WebkitMask: mask, mask }}
      />
    </div>
  );
}
