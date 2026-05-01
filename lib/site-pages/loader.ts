import path from "node:path";
import fs from "node:fs/promises";
import matter from "gray-matter";

export interface SitePage {
  name: string;
  frontmatter: { title: string };
  body: string;
}

const DEFAULT_DIR = path.resolve(process.cwd(), "site-pages");

export async function loadSitePage(
  name: string,
  baseDir: string = DEFAULT_DIR,
): Promise<SitePage> {
  const filePath = path.join(baseDir, `${name}.md`);
  let raw: string;
  try {
    raw = await fs.readFile(filePath, "utf-8");
  } catch {
    throw new Error(`site page not found: ${name} (${filePath})`);
  }
  const { data, content } = matter(raw);
  if (typeof data.title !== "string" || data.title.length === 0) {
    throw new Error(`site page '${name}': frontmatter.title is required`);
  }
  return { name, frontmatter: { title: data.title }, body: content };
}
