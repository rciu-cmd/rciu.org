"use client";

import { useSyncExternalStore } from "react";

// Current Tailwind breakpoint as an index into a per-breakpoint list:
// 0 = phone, 1 = sm (640px+), 2 = md (768px+), 3 = lg (1024px+),
// 4 = xl (1280px+). Lets a grid decide in one place both how many
// columns it has and how many items fill them (see fullRows below).
const QUERIES = ["(min-width: 640px)", "(min-width: 768px)", "(min-width: 1024px)", "(min-width: 1280px)"];

function subscribe(onChange: () => void) {
  const lists = QUERIES.map((q) => window.matchMedia(q));
  for (const l of lists) l.addEventListener("change", onChange);
  return () => {
    for (const l of lists) l.removeEventListener("change", onChange);
  };
}

function current() {
  return QUERIES.filter((q) => window.matchMedia(q).matches).length;
}

export type PerBreakpoint = [number, number, number, number, number];

export function useBreakpoint(): number {
  // The static export is rendered without a window; the home page's
  // grids only fill in after their data loads in the browser anyway.
  return useSyncExternalStore(subscribe, current, () => 4);
}

// How many of `count` items to show in a `cols`-column grid, at most
// `max`, so no row is left half-empty — a partial row only when
// there's less than one full row to show.
export function fullRows(count: number, cols: number, max: number): number {
  const n = Math.min(count, max);
  return n <= cols ? n : n - (n % cols);
}
