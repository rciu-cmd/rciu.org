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
import Navbar from "@/components/Navbar";
// DistrictBanner removed from the top of the site per request — the top
// strip above the hero was deleted. District 3450 logo placement pending
// the user's choice of where else to show it (see conversation).
import ThemeStrip from "@/components/ThemeStrip";
import Footer from "@/components/Footer";

const SITE_DESCRIPTION =
  "Rotary Club of Ikh Urgoo (RCIU) — Ulaanbaatar, Mongolia. News, community service projects, membership, and how to join or donate.";

export const metadata: Metadata = {
  metadataBase: new URL("https://rciu.org"),
  title: {
    default: "Rotary Club of Ikh Urgoo",
    template: "%s · Rotary Club of Ikh Urgoo",
  },
  description: SITE_DESCRIPTION,
  icons: {
    // Transparent PNG (the corners of the original .jpg are opaque
    // white, which shows as a white/dark square card behind the round
    // emblem on browser tabs, bookmarks, and home-screen icons) —
    // same emblem, just with its background removed.
    icon: [
      { url: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/logos/rciu-emblem-transparent.png`, type: "image/png" },
    ],
    apple: [
      { url: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/logos/rciu-emblem-transparent.png`, type: "image/png" },
    ],
  },
  openGraph: {
    title: "Rotary Club of Ikh Urgoo",
    description: SITE_DESCRIPTION,
    url: "https://rciu.org",
    siteName: "Rotary Club of Ikh Urgoo",
    images: [{ url: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/logos/rciu-emblem.jpg`, width: 512, height: 512 }],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Rotary Club of Ikh Urgoo",
    description: SITE_DESCRIPTION,
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
      </body>
    </html>
  );
}
