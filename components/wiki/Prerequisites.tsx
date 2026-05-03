import Link from "next/link";
import type { Route } from "next";

interface PrerequisitesProps {
  items: { slug: string; title: string }[];
}

export function Prerequisites({ items }: PrerequisitesProps) {
  if (items.length === 0) return null;
  return (
    <aside
      aria-label="Prerequisites"
      className="bg-[var(--canvas)] border border-[var(--hairline)] rounded-[var(--r-md)] p-4 my-6 border-l-4"
      style={{ borderLeftColor: "var(--brand-from)" }}
    >
      <p className="text-sm font-semibold text-[var(--ink)] mb-2">
        먼저 보면 좋아요
      </p>
      <ul className="space-y-1 text-sm">
        {items.map((item) => (
          <li key={item.slug}>
            <Link
              href={`/wiki/${item.slug}` as Route}
              className="text-[var(--ink-muted)] hover:text-[var(--ink)]"
            >
              {item.title}
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
