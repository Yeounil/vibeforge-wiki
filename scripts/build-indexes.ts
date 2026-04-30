import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { loadVault } from "../lib/wiki/load";
import { buildBacklinks } from "../lib/wiki/backlinks";
import { buildTagMap } from "../lib/wiki/tags";
import { buildSearchIndex } from "../lib/wiki/search-index";

const ROOT = path.resolve(__dirname, "..");
const CONTENT_DIR = path.join(ROOT, "content");
const OUT_DIR = path.join(ROOT, "public", "wiki-data");

interface PageManifestEntry {
  slug: string;
  title: string;
  tags: string[];
  updated: string;
}

async function main() {
  console.log(`[build-indexes] reading vault from ${CONTENT_DIR}`);
  const pages = await loadVault(CONTENT_DIR);
  console.log(`[build-indexes] loaded ${pages.length} pages`);

  const { backlinks, broken } = buildBacklinks(pages);
  if (broken.length > 0) {
    console.warn(`[build-indexes] ${broken.length} broken wiki-link(s):`);
    for (const b of broken) {
      console.warn(`  ${b.from} → [[${b.target}]]`);
    }
  }

  const tags = buildTagMap(pages);
  const searchIdx = buildSearchIndex(pages);

  const manifest: PageManifestEntry[] = pages.map((p) => ({
    slug: p.slug,
    title: p.frontmatter.title,
    tags: p.frontmatter.tags,
    updated: p.frontmatter.updated,
  }));

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(path.join(OUT_DIR, "manifest.json"), JSON.stringify(manifest, null, 2));
  await writeFile(path.join(OUT_DIR, "backlinks.json"), JSON.stringify(backlinks));
  await writeFile(path.join(OUT_DIR, "tags.json"), JSON.stringify(tags));
  await writeFile(path.join(OUT_DIR, "search.json"), JSON.stringify(searchIdx));

  console.log(`[build-indexes] wrote 4 JSON files to ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
