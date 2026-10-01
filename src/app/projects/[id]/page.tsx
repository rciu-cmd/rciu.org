import type { Metadata } from "next";
import ProjectDetail from "@/components/ProjectDetail";
import { PLACEHOLDER_ID, getProjectShareItems, shareMetadata, staticParams } from "@/lib/share-data";

// /projects/<id>/ — one static page per project, built so a shared link
// shows the project's own title, description and photo
// (src/lib/share-data.ts). The content itself still loads live in the
// browser. Projects added after the last build have no page here yet:
// their URL falls through to the 404 page, which forwards to
// /projects/view/?id=… until the next (hourly) rebuild.
export const dynamicParams = false;

type Props = { params: Promise<{ id: string }> };

export async function generateStaticParams() {
  return staticParams(await getProjectShareItems());
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const item = (await getProjectShareItems()).find((p) => p.id === id);
  return shareMetadata(item, `/projects/${id}/`, "Төсөл · Project");
}

export default async function ProjectPage({ params }: Props) {
  const { id } = await params;
  return <ProjectDetail id={id === PLACEHOLDER_ID ? null : id} />;
}
