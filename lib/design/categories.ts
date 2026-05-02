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
  { slug: "data-handling", label: "데이터 다루기", colorVar: "--cat-data-handling" },
  { slug: "how-computers-work", label: "컴퓨터는 어떻게 일하나", colorVar: "--cat-how-computers-work" },
  { slug: "code-flow", label: "코드 흐름", colorVar: "--cat-code-flow" },
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
