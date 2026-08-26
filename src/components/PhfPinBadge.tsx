"use client";

import Image from "next/image";
import { asset } from "@/lib/asset";
import { phfTheme, MAJOR_DONOR_THEME } from "@/lib/phf";

// Real Rotary-style pin photos (uploaded by the club), one per level.
const PIN_IMAGES: Record<string, string> = {
  PHF: "/badges/phf/phf-base.png",
  "PHF+1": "/badges/phf/phf-plus1.png",
  "PHF+2": "/badges/phf/phf-plus2.png",
  "PHF+3": "/badges/phf/phf-plus3.png",
  "PHF+4": "/badges/phf/phf-plus4.png",
  "PHF+5": "/badges/phf/phf-plus5.png",
  "PHF+6": "/badges/phf/phf-plus6.png",
  "PHF+7": "/badges/phf/phf-plus7.png",
  "PHF+8": "/badges/phf/phf-plus8.png",
};

export default function PhfPinBadge({
  level,
  size = 28,
  majorDonor = false,
}: {
  level: string;
  size?: number;
  majorDonor?: boolean;
}) {
  // Major Donor pin (diamond-shaped) takes priority over the regular
  // gem pin — Major Donor recognition replaces the PHF+N display
  // entirely (not shown alongside it), so this renders even for a
  // member whose phf_level is "none".
  if (majorDonor) {
    return (
      <span className="inline-flex items-center" title={MAJOR_DONOR_THEME.label}>
        <Image
          src={asset("/badges/phf/phf-major-donor.png")}
          alt="Major Donor"
          width={size}
          height={size}
          style={{ width: size, height: size }}
        />
      </span>
    );
  }

  const theme = phfTheme(level);
  if (level === "none") return null;

  const image = PIN_IMAGES[level];
  if (image) {
    return (
      <span className="inline-flex items-center" title={theme.label}>
        <Image src={asset(image)} alt={theme.label} width={size} height={size} style={{ width: size, height: size }} />
      </span>
    );
  }

  // Fallback SVG pin — every current level (PHF..PHF+8) now has a real
  // photo above, so this only renders if a future level is added
  // without a matching image yet.
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
