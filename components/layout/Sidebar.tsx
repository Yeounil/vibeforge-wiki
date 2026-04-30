// components/layout/Sidebar.tsx
import Link from "next/link";
import type { Route } from "next";
import { listCategories, getCategoryMeta } from "@/lib/design/categories";

export interface SidebarPage {
  slug: string;
  title: string;
  category: string;
}

interface Props {
  pages: SidebarPage[];
  currentSlug: string | null;
}

export function Sidebar({ pages, currentSlug }: Props) {
  const order = listCategories().map((c) => c.slug);
  const byCat = new Map<string, SidebarPage[]>();
  for (const p of pages) {
    if (!byCat.has(p.category)) byCat.set(p.category, []);
    byCat.get(p.category)!.push(p);
  }
  const knownThenRest = [
    ...order.filter((c) => byCat.has(c)),
    ...Array.from(byCat.keys()).filter((c) => !order.includes(c)),
  ];
  return (
    <nav
      aria-label="Categories"
      className="bg-[var(--surface-card)] rounded-[var(--radius-card)] shadow-[var(--surface-shadow)] p-4"
    >
      {knownThenRest.map((cat) => {
        const meta = getCategoryMeta(cat);
        return (
          <div key={cat} className="mb-4 last:mb-0">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)] mb-2">
              <span
                aria-hidden
                className="inline-block w-2 h-2 rounded-full"
                style={{ backgroundColor: `var(${meta.colorVar})` }}
              />
              {meta.label}
            </div>
            <ul className="pl-4 space-y-1 text-sm text-[var(--text-secondary)]">
              {byCat.get(cat)!.map((p) => {
                const isCurrent = p.slug === currentSlug;
                return (
                  <li key={p.slug}>
                    <Link
                      href={`/wiki/${p.slug}` as Route}
                      aria-current={isCurrent ? "page" : undefined}
                      className={
                        isCurrent
                          ? "text-[var(--text-primary)] font-medium"
                          : "hover:text-[var(--text-primary)]"
                      }
                    >
                      {p.title}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
