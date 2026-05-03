import Link from "next/link";
import type { Route } from "next";

interface BreadcrumbProps {
  category: string;
  categoryLabel: string;
  chain: { slug: string | null; title: string }[];
}

export function Breadcrumb({ category, categoryLabel, chain }: BreadcrumbProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="text-xs text-[var(--ink-muted)] mb-3 overflow-x-auto whitespace-nowrap"
    >
      <Link href="/wiki" className="hover:text-[var(--ink)]">
        Wiki
      </Link>
      <span aria-hidden className="mx-1">›</span>
      <Link
        href={`/wiki?category=${encodeURIComponent(category)}` as Route}
        className="hover:text-[var(--ink)]"
      >
        {categoryLabel}
      </Link>
      {chain.map((node, idx) => (
        <span key={`${node.slug ?? "current"}-${idx}`}>
          <span aria-hidden className="mx-1">›</span>
          {node.slug ? (
            <Link
              href={`/wiki/${node.slug}` as Route}
              className="hover:text-[var(--ink)]"
            >
              {node.title}
            </Link>
          ) : (
            <span className="text-[var(--ink)]">{node.title}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
