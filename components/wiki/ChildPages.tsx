import Link from "next/link";
import type { Route } from "next";

interface ChildPagesProps {
  items: { slug: string; title: string }[];
}

export function ChildPages({ items }: ChildPagesProps) {
  if (items.length === 0) return null;
  return (
    <section aria-label="Child pages" className="mt-8">
      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">
        이 개념을 더 깊게 다루는 글
      </h2>
      <ul className="space-y-1 text-sm">
        {items.map((item) => (
          <li key={item.slug}>
            <Link
              href={`/wiki/${item.slug}` as Route}
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              {item.title}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
