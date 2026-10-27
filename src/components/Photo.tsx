"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";

// next/image for club photos: if the resized copy from the image
// service (src/lib/image-loader.ts) fails to load, it shows the
// original file instead, so a photo never goes missing because of it.
export default function Photo({ alt, unoptimized, onError, ...props }: ImageProps) {
  const [failed, setFailed] = useState(false);
  return (
    <Image
      {...props}
      alt={alt}
      unoptimized={unoptimized || failed}
      onError={(e) => {
        if (!unoptimized) setFailed(true);
        onError?.(e);
      }}
    />
  );
}
