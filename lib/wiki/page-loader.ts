import path from "node:path";
import { readFile } from "node:fs/promises";
import { loadVault } from "./load";
import { buildBacklinks, buildAliasMap } from "./backlinks";
import { renderBody } from "./render";
import type { Page } from "./types";
import type { VaultHierarchy } from "./hierarchy";

const CONTENT_DIR = path.resolve(process.cwd(), "content");
const TREE_JSON_PATH = path.resolve(process.cwd(), "public", "wiki-data", "tree.json");

interface LoadedPageBundle {
  page: Page;
  bodyHtml: string;
  backlinks: string[];
  titleMap: Record<string, string>;
}

let cache: {
  all: Page[];
  titleMap: Record<string, string>;
  aliasMap: Map<string, string>;
  backlinks: Record<string, string[]>;
  hierarchy: VaultHierarchy;
} | null = null;

async function loadHierarchyFromDisk(): Promise<VaultHierarchy> {
  try {
    const raw = await readFile(TREE_JSON_PATH, "utf-8");
    return JSON.parse(raw) as VaultHierarchy;
  } catch {
    // tree.json missing — degrade gracefully to empty (Sidebar/UI fallback paths cover this)
    return {};
  }
}

async function ensureCache() {
  if (cache) return cache;
  const all = await loadVault(CONTENT_DIR);
  const aliasMap = buildAliasMap(all);
  const { backlinks } = buildBacklinks(all);
  const titleMap: Record<string, string> = {};
  for (const p of all) titleMap[p.slug] = p.frontmatter.title;
  const hierarchy = await loadHierarchyFromDisk();
  cache = { all, titleMap, aliasMap, backlinks, hierarchy };
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

export async function getAllPages(): Promise<Page[]> {
  const { all } = await ensureCache();
  return all;
}

export async function getAliasMap(): Promise<Map<string, string>> {
  const { aliasMap } = await ensureCache();
  return aliasMap;
}

export async function getBacklinkMap() {
  const { backlinks } = await ensureCache();
  return backlinks;
}

export async function getHierarchy(): Promise<VaultHierarchy> {
  const { hierarchy } = await ensureCache();
  return hierarchy;
}

export async function getTitleMap(): Promise<Record<string, string>> {
  const { titleMap } = await ensureCache();
  return titleMap;
}
