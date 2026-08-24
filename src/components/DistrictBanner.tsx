"use client";

import Image from "next/image";
import { asset } from "@/lib/asset";

// Slim strip above the theme banner, showing the district affiliation
// — logo only, no text, on a white background.
export default function DistrictBanner() {
  return (
    <div className="w-full bg-white border-b border-slate-200">
      <div className="container-page h-10 flex items-center justify-center">
        <Image src={asset("/logos/district-3450.png")} alt="Rotary District 3450" width={140} height={75} className="object-contain h-8 w-auto" />
      </div>
    </div>
  );
}
