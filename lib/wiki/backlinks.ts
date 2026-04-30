import type { Page, BacklinkMap } from "./types";

const WIKI_LINK_RE = /(?<!\[)\[\[([^\[\]|]+?)(?:\|[^\[\]]+?)?\]\](?!\])/g;

export function buildAliasMap(pages: Page[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const p of pages) {
    m.set(p.slug.toLowerCase(), p.slug);
    m.set(p.frontmatter.title.toLowerCase(), p.slug);
    for (const alias of p.frontmatter.aliases) {
      m.set(alias.toLowerCase(), p.slug);
    }
    // also accept the leaf of the slug (e.g., "page-2" of "cat-a/page-2")
    const leaf = p.slug.split("/").pop();
    if (leaf) m.set(leaf.toLowerCase(), p.slug);
  }
  return m;
}

export interface BacklinkBuildResult {
  backlinks: BacklinkMap;
  broken: { from: string; target: string }[];
}

export function buildBacklinks(pages: Page[]): BacklinkBuildResult {
  const aliasMap = buildAliasMap(pages);
  const backlinks: BacklinkMap = {};
  const broken: { from: string; target: string }[] = [];

  for (const p of pages) {
    const seen = new Set<string>(); // dedupe per source page
    for (const match of p.body.matchAll(WIKI_LINK_RE)) {
      const target = match[1].trim();
      const resolved = aliasMap.get(target.toLowerCase());
      if (!resolved) {
        broken.push({ from: p.slug, target });
        continue;
      }
      const key = `${p.slug}->${resolved}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (!backlinks[resolved]) backlinks[resolved] = [];
      backlinks[resolved].push(p.slug);
    }
  }

  // sort backlinks deterministically
  for (const k of Object.keys(backlinks)) {
    backlinks[k].sort();
  }

  return { backlinks, broken };
}
