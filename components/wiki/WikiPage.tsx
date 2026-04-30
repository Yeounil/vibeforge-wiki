import { Backlinks } from "./Backlinks";
import type { PageFrontmatter } from "@/lib/wiki/types";

interface Props {
  slug: string;
  frontmatter: PageFrontmatter;
  bodyHtml: string;
  backlinks: string[];
  titleMap: Record<string, string>;
  /** GitHub URL prefix for "Edit on GitHub" — pass null to hide */
  editBaseUrl: string | null;
  /** filePath relative to wiki repo root, e.g. "data/cat-a/page.md" */
  filePath: string;
}

export function WikiPage({
  slug,
  frontmatter,
  bodyHtml,
  backlinks,
  titleMap,
  editBaseUrl,
  filePath,
}: Props) {
  return (
    <article className="prose max-w-3xl mx-auto p-6">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">{frontmatter.title}</h1>
        <div className="text-sm text-gray-500 mt-1">
          updated {frontmatter.updated} ·{" "}
          {frontmatter.tags.length > 0 && (
            <span>
              tags:{" "}
              {frontmatter.tags.map((t, i) => (
                <span key={t}>
                  <a href={`/wiki/tag/${encodeURIComponent(t)}`} className="underline">
                    {t}
                  </a>
                  {i < frontmatter.tags.length - 1 ? ", " : ""}
                </span>
              ))}
            </span>
          )}
        </div>
      </header>

      {frontmatter.video && (
        <div className="mb-6 aspect-video">
          <iframe
            src={frontmatter.video}
            title="Video"
            className="w-full h-full"
            allowFullScreen
          />
        </div>
      )}

      <div dangerouslySetInnerHTML={{ __html: bodyHtml }} />

      <Backlinks slugs={backlinks} titleMap={titleMap} />

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

      <p className="mt-2 text-xs text-gray-400">slug: {slug}</p>
    </article>
  );
}
