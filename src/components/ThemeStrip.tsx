"use client";

import { useEffect, useState } from "react";
import { asset } from "@/lib/asset";
import { supabase } from "@/lib/supabase";

const DEFAULT_BANNER = "/theme/create-lasting-impact-pink-wide.png";

// Thin, full-width, site-wide strip right under the navbar — the
// current Rotary year's theme/motto image, tiled so it repeats across
// the full width instead of stretching. Height matches the navbar's
// language-button row (h-9). The image itself is admin-editable from
// /admin/settings (site_settings key "rotary_theme_banner_url"), so
// next Rotary year someone just swaps the picture, no code change.
export default function ThemeStrip() {
  const [bannerUrl, setBannerUrl] = useState(DEFAULT_BANNER);

  useEffect(() => {
    supabase
      .from("site_settings")
      .select("value_en")
      .eq("key", "rotary_theme_banner_url")
      .single()
      .then(({ data }) => {
        if (data?.value_en) setBannerUrl(data.value_en);
      });
  }, []);

  const src = bannerUrl.startsWith("http") ? bannerUrl : asset(bannerUrl);

  return (
    <div
      className="h-9 w-full"
      style={{ backgroundImage: `url(${src})`, backgroundRepeat: "repeat-x", backgroundSize: "auto 100%" }}
      role="presentation"
      aria-hidden="true"
    />
  );
}
