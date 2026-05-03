// components/wiki/WikiPage.tsx
import type { PageFrontmatter } from "@/lib/wiki/types";
import { Breadcrumb } from "./Breadcrumb";
import { Prerequisites } from "./Prerequisites";
import { ChildPages } from "./ChildPages";

interface Props {
  slug: string;
  frontmatter: PageFrontmatter;
  bodyHtml: string;
  /** GitHub URL prefix for "Edit on GitHub" — pass null to hide */
  editBaseUrl: string | null;
  /** filePath relative to wiki repo root, e.g. "data/cat-a/page.md" */
  filePath: string;
  category: string;
  categoryLabel: string;
  parentChain: { slug: string; title: string }[];
  prereqItems: { slug: string; title: string }[];
  childItems: { slug: string; title: string }[];
}

export function WikiPage({
  slug,
  frontmatter,
  bodyHtml,
  editBaseUrl,
  filePath,
  category,
  categoryLabel,
  parentChain,
  prereqItems,
  childItems,
}: Props) {
  const breadcrumbChain = [
    ...parentChain.map((node) => ({ slug: node.slug as string | null, title: node.title })),
    { slug: null as string | null, title: frontmatter.title },
  ];

  return (
    <article className="bg-[var(--canvas)] border border-[var(--hairline)] rounded-[var(--r-md)] p-6 md:p-8">
      <Breadcrumb category={category} categoryLabel={categoryLabel} chain={breadcrumbChain} />
      <header className="mb-6">
        <h1 className="text-3xl font-bold">{frontmatter.title}</h1>
        <div className="text-sm text-[var(--ink-muted)] mt-1">
          updated {frontmatter.updated}
          {frontmatter.tags.length > 0 && (
            <>
              {" · tags: "}
              {frontmatter.tags.map((t, i) => (
                <span key={t}>
                  <a
                    href={`/wiki/tag/${encodeURIComponent(t)}`}
                    className="underline hover:text-[var(--ink)]"
                  >
                    {t}
                  </a>
                  {i < frontmatter.tags.length - 1 ? ", " : ""}
                </span>
              ))}
            </>
          )}
        </div>
      </header>

      {frontmatter.video && (
        <div className="mb-6 aspect-video rounded-lg overflow-hidden">
          <iframe
            src={frontmatter.video}
            title="Video"
            className="w-full h-full"
            allowFullScreen
          />
        </div>
      )}

      <Prerequisites items={prereqItems} />

      <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: bodyHtml }} />

      <ChildPages items={childItems} />

      {editBaseUrl && (
        <p className="mt-8 text-sm">
          <a
            href={`${editBaseUrl}/edit/main/${filePath}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            이 페이지 GitHub에서 편집
          </a>
        </p>
      )}

      <p className="mt-2 text-xs text-[var(--ink-muted)] opacity-60">slug: {slug}</p>
    </article>
  );
}
