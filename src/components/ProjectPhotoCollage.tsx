"use client";

import Image from "@/components/Photo";

// Auto-collage for a project's photos — shared by the homepage's
// project grid and the full /projects page so both stay in sync. 1
// photo fills the frame, 2 sit side by side, 3 puts one large photo
// on the left with the other two stacked on the right. photos.length
// is always 1-3 here (callers cap it via .slice(0, 3)), so no >3
// layout is needed. `sizes` is how wide the whole collage shows (as
// for next/image), so the photos are fetched at about that width.
export default function ProjectPhotoCollage({ photos, sizes = "100vw", className = "" }: { photos: string[]; sizes?: string; className?: string }) {
  if (photos.length === 0) return null;

  if (photos.length === 1) {
    return (
      <div className={`relative w-full aspect-video bg-slate-100 ${className}`}>
        <Image src={photos[0]} alt="" fill sizes={sizes} className="photo-cover" />
      </div>
    );
  }
  if (photos.length === 2) {
    return (
      <div className={`grid grid-cols-2 gap-0.5 w-full aspect-video bg-slate-100 ${className}`}>
        {photos.map((url, i) => (
          <div key={i} className="relative">
            <Image src={url} alt="" fill sizes={sizes} className="photo-cover" />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className={`grid grid-cols-2 grid-rows-2 gap-0.5 w-full aspect-video bg-slate-100 ${className}`}>
      <div className="relative row-span-2">
        <Image src={photos[0]} alt="" fill sizes={sizes} className="photo-cover" />
      </div>
      <div className="relative">
        <Image src={photos[1]} alt="" fill sizes={sizes} className="photo-cover" />
      </div>
      <div className="relative">
        <Image src={photos[2]} alt="" fill sizes={sizes} className="photo-cover" />
      </div>
    </div>
  );
}
