// app/wiki/[...slug]/page.tsx
import { loadOnePage, getAllSlugs, getAllPages, getHierarchy } from "@/lib/wiki/page-loader";
import {
  getParentChain,
  getChildItems,
  getPrereqItems,
} from "@/lib/wiki/hierarchy";
import { WikiPage } from "@/components/wiki/WikiPage";
import { AppShell } from "@/components/layout/AppShell";
import { Sidebar } from "@/components/layout/Sidebar";
import { RightPanel } from "@/components/layout/RightPanel";
import { TableOfContents, extractHeadings } from "@/components/wiki/TableOfContents";
import { Backlinks } from "@/components/wiki/Backlinks";
import { RelatedQA } from "@/components/wiki/RelatedQA";
import { GiscusEmbed } from "@/components/wiki/GiscusEmbed";
import { SearchBox } from "@/components/wiki/SearchBox";
import { getCategoryMeta } from "@/lib/design/categories";
import { createClient } from "@/lib/supabase/server";
import { listPostsByWikiSlug } from "@/lib/wiki-qa/queries";

const EDIT_BASE_URL = process.env.NEXT_PUBLIC_WIKI_REPO_URL ?? null;

export const dynamicParams = true;
export const revalidate = 60;

export async function generateStaticParams() {
  const slugs = await getAllSlugs();
  return slugs.map((slug) => ({
    slug: slug.split("/"),
  }));
}

export default async function WikiSlugPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const fullSlug = slug.map(decodeURIComponent).join("/");
  const bundle = await loadOnePage(fullSlug);
  if (!bundle) {
    // Throw instead of notFound() so ISR keeps the previously cached response
    // on transient failures rather than caching a 404 for the full revalidate
    // window (vercel/next.js#79497).
    throw new Error(`Wiki page not found: ${fullSlug}`);
  }

  const all = await getAllPages();
  const hierarchy = await getHierarchy();
  const sidebarPages = all.map((p) => ({
    slug: p.slug,
    title: p.frontmatter.title,
    category: p.slug.split("/")[0],
  }));

  const category = fullSlug.split("/")[0];
  const categoryMeta = getCategoryMeta(category);
  const parentChain = getParentChain(hierarchy, fullSlug, bundle.titleMap);
  const childItems = getChildItems(hierarchy, fullSlug, bundle.titleMap);
  const prereqItems = getPrereqItems(hierarchy, fullSlug, bundle.titleMap);

  let relatedQA: Awaited<ReturnType<typeof listPostsByWikiSlug>> = [];
  try {
    const supabase = await createClient();
    relatedQA = await listPostsByWikiSlug(supabase, fullSlug, 20);
  } catch (e) {
    console.error("[RelatedQA load failed]", e);
  }

  const headings = extractHeadings(bundle.bodyHtml);

  // Mobile-only slot nodes. Re-use the same components used in the desktop
  // right rail / inline below — server-rendered JSX gets passed as props to
  // the (client) WikiPage which renders them inside <WikiPageMeta>.
  const mobileBacklinksSlot = (
    <Backlinks slugs={bundle.backlinks} titleMap={bundle.titleMap} />
  );
  const mobileRelatedQASlot = <RelatedQA posts={relatedQA} />;
  const mobileCommentsSlot = <GiscusEmbed pathname={`/wiki/${fullSlug}`} />;

  return (
    <AppShell
      headerSearch={<SearchBox />}
      sidebar={<Sidebar pages={sidebarPages} tree={hierarchy} currentSlug={fullSlug} />}
      main={
        <>
          <WikiPage
            slug={fullSlug}
            frontmatter={bundle.page.frontmatter}
            bodyHtml={bundle.bodyHtml}
            editBaseUrl={EDIT_BASE_URL}
            filePath={bundle.page.filePath}
            category={category}
            categoryLabel={categoryMeta.label}
            parentChain={parentChain}
            prereqItems={prereqItems}
            childItems={childItems}
            headings={headings}
            mobileBacklinksSlot={mobileBacklinksSlot}
            mobileRelatedQASlot={mobileRelatedQASlot}
            mobileCommentsSlot={mobileCommentsSlot}
            backlinksCount={bundle.backlinks.length}
            relatedQACount={relatedQA.length}
          />
          <div className="hidden lg:block">
            <GiscusEmbed pathname={`/wiki/${fullSlug}`} />
          </div>
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
