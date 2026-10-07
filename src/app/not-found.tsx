import type { Metadata } from "next";
import NotFoundContent from "@/components/NotFoundContent";

export const metadata: Metadata = {
  title: "Page not found",
  // Served for every missing URL, so it has no address of its own.
  alternates: { canonical: null },
};

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

// A post or project created after the last build has no /news/<id>/ or
// /projects/<id>/ page yet, so GitHub Pages serves this 404 page for it.
// Forward those straight to /news/view/?id=… (which loads any post live)
// before anything is drawn — runs as the HTML is parsed, ahead of React.
const FORWARD_NEW_ITEMS = `(function(){var b=${JSON.stringify(BASE_PATH)},p=location.pathname;if(b&&p.indexOf(b)===0)p=p.slice(b.length);var m=p.match(/^\\/(news|projects)\\/([0-9a-fA-F-]{36})\\/?$/);if(m)location.replace(b+"/"+m[1]+"/view/?id="+m[2]);})();`;

export default function NotFound() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: FORWARD_NEW_ITEMS }} />
      <NotFoundContent />
    </>
  );
}
