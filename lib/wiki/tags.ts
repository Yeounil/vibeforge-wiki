import type { Page, TagMap } from "./types";

export function buildTagMap(pages: Page[]): TagMap {
  const map: TagMap = {};
  for (const p of pages) {
    for (const tag of p.frontmatter.tags) {
      if (!map[tag]) map[tag] = [];
      map[tag].push(p.slug);
    }
  }
  for (const k of Object.keys(map)) {
    map[k].sort();
  }
  return map;
}
