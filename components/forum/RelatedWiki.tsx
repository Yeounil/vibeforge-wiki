// components/forum/RelatedWiki.tsx — surfaces wiki pages this Q&A post
// references. Caller should pass non-empty slugs (parent renders nothing
// for empty case so RightPanel itself is hidden).
import Link from "next/link";
import type { Route } from "next";

interface Props {
  slugs: string[];
  titleMap: Record<string, string>;
}

export function RelatedWiki({ slugs, titleMap }: Props) {
  return (
    <section aria-label="Referenced wiki pages" className="text-sm">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-2">
        이 글이 인용한 위키
      </h2>
      <ul className="space-y-1">
        {slugs.map((slug) => (
          <li key={slug} className="flex items-center gap-2">
            <span
              aria-hidden
              className="inline-block w-1.5 h-1.5 rounded-full bg-[#7c3aed]"
            />
            <Link
              href={`/wiki/${slug}` as Route}
              className="text-[var(--text-primary)] hover:underline"
            >
              {titleMap[slug] ?? slug}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
