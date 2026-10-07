import type { Metadata } from "next";
import "@fontsource/noto-sans/400.css";
import "@fontsource/noto-sans/500.css";
import "@fontsource/noto-sans/600.css";
import "@fontsource/noto-sans/700.css";
import "@fontsource/noto-sans/800.css";
import "@fontsource/noto-sans/cyrillic-400.css";
import "@fontsource/noto-sans/cyrillic-500.css";
import "@fontsource/noto-sans/cyrillic-600.css";
import "@fontsource/noto-sans/cyrillic-700.css";
import "@fontsource/noto-sans/cyrillic-800.css";
import "./globals.css";
import { LanguageProvider } from "@/lib/language-context";
import { CLOUDFLARE_WEB_ANALYTICS_TOKEN } from "@/lib/analytics";
import Navbar from "@/components/Navbar";
// DistrictBanner removed from the top of the site per request — the top
// strip above the hero was deleted. District 3450 logo placement pending
// the user's choice of where else to show it (see conversation).
import ThemeStrip from "@/components/ThemeStrip";
import Footer from "@/components/Footer";

// Mongolian and English together: Google reads the site in English
// (pages render in the browser's language), so without this the
// Mongolian name and words never reach search results.
const SITE_NAME = "Их Өргөө Ротари Клуб · Rotary Club of Ikh Urgoo";
const SITE_DESCRIPTION =
  "Их Өргөө Ротари Клуб — Улаанбаатар хот. Мэдээ, олон нийтэд чиглэсэн төслүүд, гишүүнчлэл. Rotary Club of Ikh Urgoo (RCIU) — Ulaanbaatar, Mongolia. News, community service projects, membership, and how to join.";
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
// Wide (1200×630) link-preview picture for pages without a photo of
// their own — Facebook and Messenger show it full width.
const SHARE_IMAGE = { url: `${BASE_PATH}/logos/rciu-share.png`, width: 1200, height: 630 };

// Club details for Google's knowledge panel / search results.
const CLUB_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "NGO",
  name: "Rotary Club of Ikh Urgoo",
  alternateName: ["Их Өргөө Ротари Клуб", "RCIU"],
  url: "https://rciu.org/",
  logo: `https://rciu.org${BASE_PATH}/logos/rciu-emblem.jpg`,
  image: `https://rciu.org${SHARE_IMAGE.url}`,
  description: SITE_DESCRIPTION,
  email: "contact@rciu.org",
  sameAs: ["https://www.facebook.com/profile.php?id=100086308363177"],
  address: { "@type": "PostalAddress", addressLocality: "Ulaanbaatar", addressCountry: "MN" },
  location: {
    "@type": "Place",
    name: "Park Castle Restaurant",
    address: { "@type": "PostalAddress", addressLocality: "Ulaanbaatar", addressRegion: "Sukhbaatar District", addressCountry: "MN" },
  },
  parentOrganization: { "@type": "Organization", name: "Rotary International", url: "https://www.rotary.org/" },
};

export const metadata: Metadata = {
  metadataBase: new URL("https://rciu.org"),
  title: {
    default: SITE_NAME,
    template: "%s · Rotary Club of Ikh Urgoo",
  },
  description: SITE_DESCRIPTION,
  // Every page names its own https://rciu.org/<path>/ address as the
  // official one ("./" resolves against each page's path, with the
  // trailing slash), so Google files http://, www. and /index.html
  // copies under it. Pages that shouldn't have one turn it off
  // (not-found.tsx, the /news/view/ and /projects/view/ fallbacks).
  alternates: { canonical: "./" },
  icons: {
    // Transparent PNG (the corners of the original .jpg are opaque
    // white, which shows as a white/dark square card behind the round
    // emblem on browser tabs, bookmarks, and home-screen icons) —
    // same emblem, just with its background removed.
    // Sized copies of public/logos/rciu-emblem-transparent.png (the
    // 512px, 307 KB master) so a browser tab loads ~10 KB, not 307 KB:
    // favicon.ico holds 16/32/48px, plus 192px and a 180px Apple icon.
    // Regenerate all three from the master if the emblem ever changes.
    icon: [
      { url: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/favicon.ico`, sizes: "48x48" },
      { url: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/icons/icon-192.png`, type: "image/png", sizes: "192x192" },
    ],
    apple: [
      { url: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/icons/apple-touch-icon.png`, type: "image/png", sizes: "180x180" },
    ],
  },
  openGraph: {
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: "https://rciu.org",
    siteName: "Rotary Club of Ikh Urgoo",
    images: [SHARE_IMAGE],
    locale: "mn_MN",
    alternateLocale: ["en_US"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: [SHARE_IMAGE.url],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <LanguageProvider>
          <Navbar />
          <ThemeStrip />
          <main className="flex-1">{children}</main>
          <Footer />
        </LanguageProvider>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(CLUB_JSON_LD) }} />
        {/* Visitor statistics — see src/lib/analytics.ts */}
        {CLOUDFLARE_WEB_ANALYTICS_TOKEN && (
          <script
            defer
            src="https://static.cloudflareinsights.com/beacon.min.js"
            data-cf-beacon={JSON.stringify({ token: CLOUDFLARE_WEB_ANALYTICS_TOKEN })}
          />
        )}
      </body>
    </html>
  );
}
