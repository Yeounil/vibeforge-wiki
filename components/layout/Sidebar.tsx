"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useMemo, useState } from "react";
import { listCategories, getCategoryMeta } from "@/lib/design/categories";
import type { VaultHierarchy } from "@/lib/wiki/hierarchy";

export interface SidebarPage {
  slug: string;
  title: string;
  category: string;
}

interface Props {
  pages: SidebarPage[];
  tree: VaultHierarchy;
  currentSlug: string | null;
}

const STORAGE_PREFIX = "vf:sidebar:expanded:";

function ancestorsOf(category: string, slug: string, tree: VaultHierarchy): Set<string> {
  const out = new Set<string>();
  const folderTree = tree[category];
  if (!folderTree) return out;
  let cursor: string | undefined = folderTree.parents[slug];
  while (cursor) {
    out.add(cursor);
    cursor = folderTree.parents[cursor];
  }
  return out;
}

function loadStoredToggle(slug: string): boolean | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(STORAGE_PREFIX + slug);
  if (v === "1") return true;
  if (v === "0") return false;
  return null;
}

function persistToggle(slug: string, expanded: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_PREFIX + slug, expanded ? "1" : "0");
}

export function Sidebar({ pages, tree, currentSlug }: Props) {
  const order = listCategories().map((c) => c.slug);
  const titleMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const p of pages) m[p.slug] = p.title;
    return m;
  }, [pages]);

  const byCat = new Map<string, SidebarPage[]>();
  for (const p of pages) {
    if (!byCat.has(p.category)) byCat.set(p.category, []);
    byCat.get(p.category)!.push(p);
  }
  const knownThenRest = [
    ...order.filter((c) => byCat.has(c)),
    ...Array.from(byCat.keys()).filter((c) => !order.includes(c)),
  ];

  const initialExpanded = useMemo(() => {
    const s = new Set<string>();
    if (currentSlug) {
      const folder = currentSlug.split("/")[0];
      for (const a of ancestorsOf(folder, currentSlug, tree)) s.add(a);
    }
    return s;
  }, [currentSlug, tree]);

  const [expanded, setExpanded] = useState<Set<string>>(initialExpanded);

  useEffect(() => {
    setExpanded((prev) => {
      const next = new Set(prev);
      for (const cat of knownThenRest) {
        const folderTree = tree[cat];
        if (!folderTree) continue;
        for (const slug of Object.keys(folderTree.children)) {
          if (folderTree.children[slug].length === 0) continue;
          const stored = loadStoredToggle(slug);
          if (stored === true) next.add(slug);
          if (stored === false) next.delete(slug);
        }
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggle(slug: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      const willExpand = !next.has(slug);
      if (willExpand) next.add(slug);
      else next.delete(slug);
      persistToggle(slug, willExpand);
      return next;
    });
  }

  function renderTreeNode(slug: string, depth: number, folderTree: NonNullable<VaultHierarchy[string]>): JSX.Element {
    const title = titleMap[slug] ?? slug;
    const isCurrent = slug === currentSlug;
    const children = folderTree.children[slug] ?? [];
    const hasChildren = children.length > 0;
    const isOpen = expanded.has(slug);

    return (
      <li key={slug}>
        <div className="flex items-center gap-1" style={{ paddingLeft: `${depth * 12}px` }}>
          {hasChildren ? (
            <button
              type="button"
              onClick={() => toggle(slug)}
              aria-expanded={isOpen}
              aria-label={`${title} ${isOpen ? "접기" : "펼치기"}`}
              className="w-4 text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs"
            >
              {isOpen ? "▾" : "▸"}
            </button>
          ) : (
            <span aria-hidden className="w-4" />
          )}
          <Link
            href={`/wiki/${slug}` as Route}
            aria-current={isCurrent ? "page" : undefined}
            className={
              isCurrent
                ? "text-[var(--text-primary)] font-medium"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }
          >
            {title}
          </Link>
        </div>
        {hasChildren && isOpen && (
          <ul className="space-y-1 mt-1">
            {children.map((c) => renderTreeNode(c, depth + 1, folderTree))}
          </ul>
        )}
      </li>
    );
  }

  return (
    <nav
      aria-label="Categories"
      className="bg-[var(--surface-card)] rounded-[var(--radius-card)] shadow-[var(--surface-shadow)] p-4"
    >
      {knownThenRest.map((cat) => {
        const meta = getCategoryMeta(cat);
        const folderTree = tree[cat];
        const useTree = folderTree && folderTree.roots.length > 0;
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
            <ul className="space-y-1 text-sm">
              {useTree
                ? folderTree.roots.map((rootSlug) => renderTreeNode(rootSlug, 0, folderTree))
                : byCat.get(cat)!.map((p) => {
                    const isCurrent = p.slug === currentSlug;
                    return (
                      <li key={p.slug} className="pl-4">
                        <Link
                          href={`/wiki/${p.slug}` as Route}
                          aria-current={isCurrent ? "page" : undefined}
                          className={
                            isCurrent
                              ? "text-[var(--text-primary)] font-medium"
                              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
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
