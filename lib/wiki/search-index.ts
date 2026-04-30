import MiniSearch from "minisearch";
import type { Page } from "./types";

export type SearchIndex = MiniSearch<{
  id: string;
  slug: string;
  title: string;
  body: string;
  tags: string;
}>;

export interface SearchHit {
  slug: string;
  title: string;
  score: number;
}

const FIELDS = ["title", "body", "tags"];
const STORE_FIELDS = ["slug", "title"];

function makeEmptyIndex(): SearchIndex {
  return new MiniSearch({
    fields: FIELDS,
    storeFields: STORE_FIELDS,
    searchOptions: {
      boost: { title: 3, tags: 2 },
      prefix: true,
      fuzzy: 0.2,
    },
  });
}

export function buildSearchIndex(pages: Page[]): SearchIndex {
  const idx = makeEmptyIndex();
  idx.addAll(
    pages.map((p) => ({
      id: p.slug,
      slug: p.slug,
      title: p.frontmatter.title,
      body: p.body,
      tags: p.frontmatter.tags.join(" "),
    }))
  );
  return idx;
}

export function loadSearchIndex(json: string): SearchIndex {
  return MiniSearch.loadJSON<{
    id: string;
    slug: string;
    title: string;
    body: string;
    tags: string;
  }>(json, {
    fields: FIELDS,
    storeFields: STORE_FIELDS,
    searchOptions: {
      boost: { title: 3, tags: 2 },
      prefix: true,
      fuzzy: 0.2,
    },
  });
}

export function searchPages(idx: SearchIndex, query: string): SearchHit[] {
  if (!query.trim()) return [];
  const results = idx.search(query);
  return results.map((r) => ({
    slug: r.slug as string,
    title: r.title as string,
    score: r.score,
  }));
}
