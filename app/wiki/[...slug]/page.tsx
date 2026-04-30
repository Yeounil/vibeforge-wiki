import { notFound } from "next/navigation";
import { loadOnePage, getAllSlugs, getAllPages } from "@/lib/wiki/page-loader";
import { WikiPage } from "@/components/wiki/WikiPage";
import { AppShell } from "@/components/layout/AppShell";
import { Sidebar } from "@/components/layout/Sidebar";
import { RightPanel } from "@/components/layout/RightPanel";
import { TableOfContents } from "@/components/wiki/TableOfContents";
import { Backlinks } from "@/components/wiki/Backlinks";
import { SearchBox } from "@/components/wiki/SearchBox";

const EDIT_BASE_URL = process.env.NEXT_PUBLIC_WIKI_REPO_URL ?? null;

export const dynamicParams = true;

export async function generateStaticParams() {
  const slugs = await getAllSlugs();
  return slugs.map((slug) => ({ slug: slug.split("/") }));
}

export default async function WikiSlugPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const fullSlug = slug.join("/");
  const bundle = await loadOnePage(fullSlug);
  if (!bundle) notFound();

  const all = await getAllPages();
  const sidebarPages = all.map((p) => ({
    slug: p.slug,
    title: p.frontmatter.title,
    category: p.slug.split("/")[0],
  }));

  return (
    <AppShell
      headerSearch={<SearchBox />}
      sidebar={<Sidebar pages={sidebarPages} currentSlug={fullSlug} />}
      main={
        <WikiPage
          slug={fullSlug}
          frontmatter={bundle.page.frontmatter}
          bodyHtml={bundle.bodyHtml}
          editBaseUrl={EDIT_BASE_URL}
          filePath={bundle.page.filePath}
        />
      }
      right={
        <RightPanel>
          <TableOfContents bodyHtml={bundle.bodyHtml} />
          <Backlinks slugs={bundle.backlinks} titleMap={bundle.titleMap} />
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
  const bundle = await loadOnePage(slug.join("/"));
  if (!bundle) return { title: "Not Found" };
  return { title: `${bundle.page.frontmatter.title} — VibeForge` };
}
