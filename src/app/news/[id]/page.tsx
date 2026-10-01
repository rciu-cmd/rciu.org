import type { Metadata } from "next";
import NewsDetail from "@/components/NewsDetail";
import { PLACEHOLDER_ID, getNewsShareItems, shareMetadata, staticParams } from "@/lib/share-data";

// /news/<id>/ — one static page per published post, built so a shared
// link shows the post's own title, text and photo (src/lib/share-data.ts).
// The content itself still loads live in the browser. Posts published
// after the last build have no page here yet: their URL falls through
// to the 404 page, which forwards to /news/view/?id=… until the next
// (hourly) rebuild.
export const dynamicParams = false;

type Props = { params: Promise<{ id: string }> };

export async function generateStaticParams() {
  return staticParams(await getNewsShareItems());
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const item = (await getNewsShareItems()).find((n) => n.id === id);
  return shareMetadata(item, `/news/${id}/`, "Мэдээ · News");
}

export default async function NewsPostPage({ params }: Props) {
  const { id } = await params;
  return <NewsDetail id={id === PLACEHOLDER_ID ? null : id} />;
}
