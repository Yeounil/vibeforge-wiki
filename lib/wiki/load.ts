import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileToSlug } from "./slug";
import { parseFrontmatter } from "./frontmatter";
import type { Page } from "./types";

async function walk(dir: string, base: string): Promise<string[]> {
  const entries = await readdir(dir);
  const out: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry);
    const s = await stat(full);
    if (s.isDirectory()) {
      out.push(...(await walk(full, base)));
    } else if (s.isFile() && entry.endsWith(".md")) {
      const rel = path.relative(base, full).replace(/\\/g, "/");
      out.push(rel);
    }
  }
  return out;
}

export async function loadVault(rootDir: string): Promise<Page[]> {
  const dataDir = path.join(rootDir, "data");
  const relPaths = await walk(dataDir, rootDir);

  const pages: Page[] = [];
  for (const relPath of relPaths) {
    const fullPath = path.join(rootDir, relPath);
    const raw = await readFile(fullPath, "utf-8");
    const { frontmatter, body } = parseFrontmatter(raw);
    pages.push({
      slug: fileToSlug(relPath),
      filePath: relPath,
      frontmatter,
      body,
    });
  }

  pages.sort((a, b) => a.slug.localeCompare(b.slug));
  return pages;
}
