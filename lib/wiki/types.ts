export interface PageFrontmatter {
  title: string;
  tags: string[];
  aliases: string[];
  video: string | null;
  updated: string; // ISO date
  parent: string | null;        // RAW value from YAML (title or alias). Resolved into tree elsewhere.
  prerequisites: string[];      // RAW values from YAML.
}

export interface Page {
  slug: string;             // e.g. "data-handling/what-is-an-index"
  filePath: string;         // e.g. "data/data-handling/what-is-an-index.md"
  frontmatter: PageFrontmatter;
  body: string;             // raw markdown body (no frontmatter)
}

export interface BacklinkMap {
  // slug → list of slugs that link TO it
  [slug: string]: string[];
}

export interface TagMap {
  // tag → list of slugs
  [tag: string]: string[];
}
