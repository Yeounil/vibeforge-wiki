import path from "node:path";
import { loadVault } from "./load";
import { buildBacklinks, buildAliasMap } from "./backlinks";
import { renderBody } from "./render";
import type { Page } from "./types";

// Vault root — the git submodule mount. loadVault walks `<root>/data/**/*.md`.
const CONTENT_DIR = path.resolve(process.cwd(), "content");

interface LoadedPageBundle {
  page: Page;
  bodyHtml: string;
  backlinks: string[];
  titleMap: Record<string, string>;
}

let cache: { all: Page[]; titleMap: Record<string, string>; aliasMap: Map<string, string>; backlinks: Record<string, string[]> } | null = null;

async function ensureCache() {
  if (cache) return cache;
  const all = await loadVault(CONTENT_DIR);
  const aliasMap = buildAliasMap(all);
  const { backlinks } = buildBacklinks(all);
  const titleMap: Record<string, string> = {};
  for (const p of all) titleMap[p.slug] = p.frontmatter.title;
  cache = { all, titleMap, aliasMap, backlinks };
  return cache;
}

export async function loadOnePage(slug: string): Promise<LoadedPageBundle | null> {
  const { all, titleMap, aliasMap, backlinks } = await ensureCache();
  const page = all.find((p) => p.slug === slug);
  if (!page) return null;
  const bodyHtml = await renderBody(page.body, aliasMap);
  return {
    page,
    bodyHtml,
    backlinks: backlinks[slug] ?? [],
    titleMap,
  };
}

export async function getAllSlugs(): Promise<string[]> {
  const { all } = await ensureCache();
  return all.map((p) => p.slug);
}
