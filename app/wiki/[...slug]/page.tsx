// app/wiki/[...slug]/page.tsx
import { notFound } from "next/navigation";
import { loadOnePage, getAllSlugs, getAllPages } from "@/lib/wiki/page-loader";
import { WikiPage } from "@/components/wiki/WikiPage";
import { AppShell } from "@/components/layout/AppShell";
import { Sidebar } from "@/components/layout/Sidebar";
import { RightPanel } from "@/components/layout/RightPanel";
import { TableOfContents } from "@/components/wiki/TableOfContents";
import { Backlinks } from "@/components/wiki/Backlinks";
import { RelatedQA } from "@/components/wiki/RelatedQA";
import { GiscusEmbed } from "@/components/wiki/GiscusEmbed";
import { SearchBox } from "@/components/wiki/SearchBox";
import { createClient } from "@/lib/supabase/server";
import { listPostsByWikiSlug } from "@/lib/wiki-qa/queries";

const EDIT_BASE_URL = process.env.NEXT_PUBLIC_WIKI_REPO_URL ?? null;

export const dynamicParams = true;
export const revalidate = 60;

export async function generateStaticParams() {
  // URL-encode each segment so the static .html files are named with the
  // same encoded path the runtime sees. Without this, slugs containing
  // spaces or non-ASCII chars (e.g. "관계형 데이터 모델") generate fine but
  // 404 at request time because next start can't match the decoded URL
  // to the literal-char filesystem path. Same pattern as wiki/tag/[tag].
  const slugs = await getAllSlugs();
  return slugs.map((slug) => ({
    slug: slug.split("/").map(encodeURIComponent),
  }));
}

export default async function WikiSlugPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  // params come URL-encoded from the matched static route; decode each
  // segment to get back the canonical slug stored in the vault.
  const fullSlug = slug.map(decodeURIComponent).join("/");
  const bundle = await loadOnePage(fullSlug);
  if (!bundle) notFound();

  const all = await getAllPages();
  const sidebarPages = all.map((p) => ({
    slug: p.slug,
    title: p.frontmatter.title,
    category: p.slug.split("/")[0],
  }));

  // Related Q&A: best-effort. If Supabase is down, render empty section.
  let relatedQA: Awaited<ReturnType<typeof listPostsByWikiSlug>> = [];
  try {
    const supabase = await createClient();
    relatedQA = await listPostsByWikiSlug(supabase, fullSlug, 20);
  } catch (e) {
    console.error("[RelatedQA load failed]", e);
  }

  return (
    <AppShell
      headerSearch={<SearchBox />}
      sidebar={<Sidebar pages={sidebarPages} currentSlug={fullSlug} />}
      main={
        <>
          <WikiPage
            slug={fullSlug}
            frontmatter={bundle.page.frontmatter}
            bodyHtml={bundle.bodyHtml}
            editBaseUrl={EDIT_BASE_URL}
            filePath={bundle.page.filePath}
          />
          <GiscusEmbed pathname={`/wiki/${fullSlug}`} />
        </>
      }
      right={
        <RightPanel>
          <TableOfContents bodyHtml={bundle.bodyHtml} />
          <Backlinks slugs={bundle.backlinks} titleMap={bundle.titleMap} />
          <RelatedQA posts={relatedQA} />
        </RightPanel>
      }
    />
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const bundle = await loadOnePage(slug.map(decodeURIComponent).join("/"));
  if (!bundle) return { title: "Not Found" };
  return { title: `${bundle.page.frontmatter.title} — VibeForge` };
}
