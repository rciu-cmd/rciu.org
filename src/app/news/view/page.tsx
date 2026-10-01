"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import NewsDetail from "@/components/NewsDetail";

// /news/view/?id=… — works for every post, including ones published
// since the last build. Links on the site use /news/<id>/ (which has a
// proper link preview); this page stays for older links and as the
// fallback the 404 page forwards new posts to.
export default function NewsDetailPage() {
  return (
    // useSearchParams needs a Suspense boundary during static export.
    <Suspense fallback={<div className="container-page py-14" />}>
      <NewsFromQuery />
    </Suspense>
  );
}

function NewsFromQuery() {
  return <NewsDetail id={useSearchParams().get("id")} />;
}
