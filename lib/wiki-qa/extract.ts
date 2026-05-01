// lib/wiki-qa/extract.ts — pure: extract wiki slugs from Q&A body markdown.
// Two recognized forms:
//   1. /wiki/<path>  (absolute URL paths, both as markdown link targets and bare)
//   2. [[Page Name]] / [[Page Name|display]]  (wikilink syntax — alias-resolved)
// The aliasMap is the same buildAliasMap output used by lib/wiki/backlinks.ts:
// keys are lowercased, values are canonical slugs.

// Stops at whitespace, ), ], ", ', >, or end of string. Captures path chars
// (word chars, slashes, hyphens). Non-greedy so trailing punctuation in
// markdown like ")." doesn't get sucked in.
const WIKI_PATH_RE = /\B\/wiki\/([\w/-]+?)(?=[\s)\]"'>.,!?]|$)/g;

// Matches lib/wiki/backlinks.ts:WIKI_LINK_RE exactly (display group non-capturing
// since we only need the target). lib/wiki/wiki-link.ts uses the same pattern but
// captures the display group as well — irrelevant here.
const WIKI_LINK_RE = /(?<!\[)\[\[([^\[\]|]+?)(?:\|[^\[\]]+?)?\]\](?!\])/g;

export function extractWikiRefs(
  body: string,
  aliasMap: Map<string, string>
): string[] {
  const found = new Set<string>();

  for (const m of body.matchAll(WIKI_PATH_RE)) {
    const raw = m[1].trim().replace(/\/+$/, ""); // trailing slash off
    if (!raw) continue;
    const resolved = aliasMap.get(raw.toLowerCase());
    if (resolved) found.add(resolved);
  }

  for (const m of body.matchAll(WIKI_LINK_RE)) {
    const target = m[1].trim();
    if (!target) continue;
    const resolved = aliasMap.get(target.toLowerCase());
    if (resolved) found.add(resolved);
  }

  return Array.from(found).sort();
}
