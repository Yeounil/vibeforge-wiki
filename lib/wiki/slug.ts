const DATA_PREFIX = "data/";
const MD_SUFFIX = ".md";

export function fileToSlug(filePath: string): string {
  const normalized = filePath.replace(/\\/g, "/");
  if (!normalized.startsWith(DATA_PREFIX)) {
    throw new Error(`Path must start with "data/": got ${filePath}`);
  }
  const withoutPrefix = normalized.slice(DATA_PREFIX.length);
  if (!withoutPrefix.endsWith(MD_SUFFIX)) {
    throw new Error(`Path must end with ".md": got ${filePath}`);
  }
  return withoutPrefix.slice(0, -MD_SUFFIX.length);
}

export function slugToFilePath(slug: string): string {
  return `${DATA_PREFIX}${slug}${MD_SUFFIX}`;
}
