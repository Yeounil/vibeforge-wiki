import matter from "gray-matter";
import type { PageFrontmatter } from "./types";

interface ParseResult {
  frontmatter: PageFrontmatter;
  body: string;
}

export function parseFrontmatter(raw: string): ParseResult {
  const { data, content } = matter(raw);

  if (typeof data.title !== "string" || data.title.length === 0) {
    throw new Error("frontmatter: 'title' is required and must be a non-empty string");
  }
  // gray-matter parses YAML date values as Date objects; normalise to string
  if (data.updated instanceof Date) {
    data.updated = data.updated.toISOString().slice(0, 10);
  }
  if (typeof data.updated !== "string") {
    throw new Error("frontmatter: 'updated' is required (ISO date string)");
  }

  const tags = Array.isArray(data.tags) ? data.tags.map(String) : [];
  const aliases = Array.isArray(data.aliases) ? data.aliases.map(String) : [];
  const video = typeof data.video === "string" ? data.video : null;

  return {
    frontmatter: {
      title: data.title,
      tags,
      aliases,
      video,
      updated: data.updated,
    },
    body: content,
  };
}
