"use client";

import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { asset } from "@/lib/asset";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/language-context";
import ProjectPhotoCollage from "@/components/ProjectPhotoCollage";

type ProjectType = "local_project" | "district_grant" | "global_grant";

type ProjectRow = {
  id: string;
  title_mn: string;
  title_en: string;
  description_mn: string | null;
  description_en: string | null;
  cover_image_url: string | null;
  cause_icon: "basic_education_literacy" | "maternal_child_health" | "disease_prevention" | "other" | null;
  status: "ongoing" | "completed" | "planned";
  project_type: ProjectType;
  start_date: string | null;
  end_date: string | null;
  funding_amount: number | null;
  funding_currency: string;
  grant_number: string | null;
};

const STATUS_LABEL: Record<ProjectRow["status"], { mn: string; en: string; ja: string; zh: string }> = {
  ongoing: { mn: "Хэрэгжиж буй", en: "Ongoing", ja: "実施中", zh: "進行中" },
  completed: { mn: "Дууссан", en: "Completed", ja: "完了", zh: "已完成" },
  planned: { mn: "Төлөвлөж буй", en: "Planned", ja: "計画中", zh: "計劃中" },
};

const PROJECT_TYPE_LABEL: Record<ProjectType, { mn: string; en: string; ja: string; zh: string }> = {
  local_project: { mn: "Орон нутгийн төсөл", en: "Local Project", ja: "地域プロジェクト", zh: "本地項目" },
  district_grant: { mn: "Дүүргийн тэтгэлэг (DG)", en: "District Grant (DG)", ja: "地区補助金(DG)", zh: "地區獎助金(DG)" },
  global_grant: { mn: "Глобал тэтгэлэг (GG)", en: "Global Grant (GG)", ja: "グローバル補助金(GG)", zh: "全球獎助金(GG)" },
};

const CAUSE_ICONS: Record<string, string> = {
  basic_education_literacy: "/causes/basic-education-literacy.png",
  maternal_child_health: "/causes/maternal-child-health.png",
  disease_prevention: "/causes/disease-prevention-treatment.png",
};

export default function ProjectDetailPage() {
  return (
    // useSearchParams needs a Suspense boundary during static export —
    // the id itself is only ever read client-side at runtime, same as
    // every other data fetch in this app.
    <Suspense fallback={<div className="container-page py-14" />}>
      <ProjectDetail />
    </Suspense>
  );
}

function ProjectDetail() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const [project, setProject] = useState<ProjectRow | null | undefined>(undefined);
  const [photos, setPhotos] = useState<string[]>([]);

  useEffect(() => {
    if (!id) {
      setProject(null);
      return;
    }
    supabase
      .from("projects")
      .select("*")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => setProject((data as ProjectRow | null) ?? null));

    // Every photo, not just the 3-photo homepage/list collage cap.
    supabase
      .from("project_media")
      .select("storage_path,created_at")
      .eq("project_id", id)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        const urls = ((data as { storage_path: string }[]) ?? []).map(
          (row) => supabase.storage.from("rciu-photos").getPublicUrl(row.storage_path).data.publicUrl
        );
        setPhotos(urls);
      });
  }, [id]);

  if (project === undefined) {
    return <div className="container-page py-14 text-slate-400 text-sm">{t("Ачааллаж байна…", "Loading…", "読み込み中…", "加載中…")}</div>;
  }

  if (project === null) {
    return (
      <div className="container-page py-14">
        <p className="text-slate-500 mb-4">
          {t("Төсөл олдсонгүй.", "Project not found.", "プロジェクトが見つかりません。", "找不到該項目。")}
        </p>
        <Link href="/projects" className="text-rotary-royal-blue font-semibold hover:underline">
          {t("← Бүх төсөл рүү буцах", "← Back to all Projects", "← 全てのプロジェクトへ戻る", "← 返回所有項目")}
        </Link>
      </div>
    );
  }

  const p = project;

  return (
    <div className="container-page py-14 max-w-4xl">
      <Link href="/projects" className="text-sm text-rotary-royal-blue font-semibold hover:underline mb-6 inline-block">
        {t("← Бүх төсөл рүү буцах", "← Back to all Projects", "← 全てのプロジェクトへ戻る", "← 返回所有項目")}
      </Link>

      <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {photos.length > 0 ? (
          <ProjectPhotoCollage photos={photos.slice(0, 3)} />
        ) : p.cause_icon && CAUSE_ICONS[p.cause_icon] ? (
          <div className="w-full aspect-video flex items-center justify-center bg-blue-50">
            <Image src={asset(CAUSE_ICONS[p.cause_icon])} alt="" width={96} height={96} />
          </div>
        ) : null}

        <div className="p-8">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="inline-block text-xs font-semibold uppercase tracking-wide bg-blue-50 text-rotary-azure px-3 py-1 rounded-full">
              {t(STATUS_LABEL[p.status].mn, STATUS_LABEL[p.status].en, STATUS_LABEL[p.status].ja, STATUS_LABEL[p.status].zh)}
            </span>
            {p.project_type !== "local_project" && (
              <span className="inline-block text-xs font-bold text-white bg-rotary-gold px-3 py-1 rounded-full">
                {t(
                  PROJECT_TYPE_LABEL[p.project_type].mn,
                  PROJECT_TYPE_LABEL[p.project_type].en,
                  PROJECT_TYPE_LABEL[p.project_type].ja,
                  PROJECT_TYPE_LABEL[p.project_type].zh
                )}
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4">{t(p.title_mn, p.title_en)}</h1>

          {(p.description_mn || p.description_en) && (
            <p className="text-slate-600 whitespace-pre-wrap leading-relaxed mb-6">{t(p.description_mn ?? "", p.description_en ?? "")}</p>
          )}

          {(p.funding_amount != null || p.grant_number) && (
            <div className="rounded-xl bg-blue-50 px-4 py-3 mb-2 inline-block">
              {p.funding_amount != null && (
                <p className="text-rotary-azure font-bold text-lg">
                  {p.funding_currency} {p.funding_amount.toLocaleString()}
                </p>
              )}
              {p.grant_number && <p className="text-xs text-slate-500 mt-0.5">{p.grant_number}</p>}
            </div>
          )}
        </div>
      </div>

      {photos.length > 1 && (
        <div className="mt-8">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-3">
            {t("Бүх зураг", "All Photos", "すべての写真", "所有照片")}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {photos.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="relative block aspect-square rounded-lg overflow-hidden bg-slate-100 hover:opacity-90 transition">
                <Image src={url} alt="" fill className="object-cover" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
