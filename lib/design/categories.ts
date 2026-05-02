// lib/design/categories.ts
export interface CategoryMeta {
  slug: string;
  label: string;
  colorVar: string;
}

const KNOWN: CategoryMeta[] = [
  { slug: "concepts", label: "Concepts", colorVar: "--cat-concepts" },
  { slug: "entities", label: "Entities", colorVar: "--cat-entities" },
  { slug: "people", label: "People", colorVar: "--cat-people" },
  { slug: "sources", label: "Sources", colorVar: "--cat-sources" },
];

export function listCategories(): CategoryMeta[] {
  return KNOWN;
}

export function getCategoryMeta(slug: string): CategoryMeta {
  return KNOWN.find((c) => c.slug === slug) ?? {
    slug,
    label: slug,
    colorVar: "--cat-default",
  };
}
