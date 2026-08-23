"use client";

import { phfTheme } from "@/lib/phf";

/**
 * A Rotary-style recognition pin, drawn as SVG rather than borrowed from
 * a third-party photo — Rotary's own official pin photography lives
 * behind the (login-gated) Brand Center, which this app has no way to
 * authenticate into. This is a faithful stand-in using the same
 * material logic Rotary's own guide uses (gold PHF pin; 1-5 sapphires
 * for PHF+1..+5; 1-3 rubies for PHF+6..+8) — swap in real pin photos
 * later if you download them from Brand Center yourself.
 */
export default function PhfPinBadge({ level, size = 28 }: { level: string; size?: number }) {
  const theme = phfTheme(level);
  if (level === "none") return null;

  const gemColor = theme.gem === "ruby" ? "#9B111E" : theme.gem === "sapphire" ? "#1D4E89" : "#C9A227";
  const gems = Math.max(theme.gemCount, 1);

  return (
    <span className="inline-flex items-center gap-1" title={theme.label}>
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
        <circle cx="20" cy="20" r="18" fill="#F7A81B" stroke="#8A6D3B" strokeWidth="1.5" />
        <circle cx="20" cy="20" r="12" fill="#FFFFFF" opacity="0.15" />
        {gems === 1 && <circle cx="20" cy="20" r="6" fill={gemColor} />}
        {gems > 1 &&
          Array.from({ length: gems }).map((_, i) => {
            const angle = (i / gems) * Math.PI * 2 - Math.PI / 2;
            const r = gems > 3 ? 10 : 8;
            return (
              <circle
                key={i}
                cx={20 + r * Math.cos(angle)}
                cy={20 + r * Math.sin(angle)}
                r={gems > 5 ? 2.5 : 3.5}
                fill={gemColor}
              />
            );
          })}
      </svg>
    </span>
  );
}
