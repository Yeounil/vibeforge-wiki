import Link from "next/link";
import type { Route } from "next";

interface Props {
  slugs: string[];
  titleMap: Record<string, string>;
}

export function Backlinks({ slugs, titleMap }: Props) {
  if (slugs.length === 0) return null;
  return (
    <nav aria-label="Backlinks" className="text-sm">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-2">
        이 페이지를 인용한 곳
      </h2>
      <ul className="space-y-1">
        {slugs.map((slug) => (
          <li key={slug}>
            <Link
              href={`/wiki/${slug}` as Route}
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              {titleMap[slug] ?? slug}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
