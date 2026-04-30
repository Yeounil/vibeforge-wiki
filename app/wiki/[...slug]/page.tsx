import { notFound } from "next/navigation";
import { loadOnePage, getAllSlugs } from "@/lib/wiki/page-loader";
import { WikiPage } from "@/components/wiki/WikiPage";

// e.g., "https://github.com/Yeounil/vibeforge-wiki"
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

  return (
    <WikiPage
      slug={fullSlug}
      frontmatter={bundle.page.frontmatter}
      bodyHtml={bundle.bodyHtml}
      backlinks={bundle.backlinks}
      titleMap={bundle.titleMap}
      editBaseUrl={EDIT_BASE_URL}
      filePath={bundle.page.filePath}
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
