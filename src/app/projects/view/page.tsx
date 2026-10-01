"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import ProjectDetail from "@/components/ProjectDetail";

// /projects/view/?id=… — works for every project, including ones added
// since the last build. Links on the site use /projects/<id>/ (which has
// a proper link preview); this page stays for older links and as the
// fallback the 404 page forwards new projects to.
export default function ProjectDetailPage() {
  return (
    // useSearchParams needs a Suspense boundary during static export.
    <Suspense fallback={<div className="container-page py-14" />}>
      <ProjectFromQuery />
    </Suspense>
  );
}

function ProjectFromQuery() {
  return <ProjectDetail id={useSearchParams().get("id")} />;
}
