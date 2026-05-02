import path from "node:path";
import { readFile, readdir, stat } from "node:fs/promises";
import matter from "gray-matter";
import { buildAliasMap, WIKI_LINK_RE } from "../lib/wiki/backlinks";
import { fileToSlug } from "../lib/wiki/slug";
import type { Page } from "../lib/wiki/types";
import { validateHierarchy } from "../lib/wiki/hierarchy";

export interface CheckIssue {
  file: string;
  message: string;
}

export interface CheckResult {
  exitCode: 0 | 1 | 2;
  errors: CheckIssue[];
  warnings: CheckIssue[];
  pagesChecked: number;
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const REPEAT_LINK_THRESHOLD = 5;

async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = path.join(dir, e);
    const s = await stat(full);
    if (s.isDirectory()) out.push(...(await walk(full)));
    else if (s.isFile() && e.endsWith(".md")) out.push(full);
  }
  return out;
}

interface ParsedPage {
  relPath: string;
  slug: string;
  title: string;
  tags: string[];
  aliases: string[];
  updated: string;
  body: string;
  parent: string | null;
  prerequisites: string[];
}

export async function runCheck(vaultDir: string): Promise<CheckResult> {
  const dataDir = path.join(vaultDir, "data");
  // walk() swallows readdir errors (so empty dirs return [] cleanly), so probe
  // dataDir explicitly first — a missing vault must fail loudly (exit 2), not
  // silently green-pass with "0 pages checked, all good ✓".
  try {
    const s = await stat(dataDir);
    if (!s.isDirectory()) {
      return {
        exitCode: 2,
        errors: [{ file: dataDir, message: `vault data path is not a directory` }],
        warnings: [],
        pagesChecked: 0,
      };
    }
  } catch (e) {
    return {
      exitCode: 2,
      errors: [{ file: dataDir, message: `cannot read vault: ${(e as Error).message}` }],
      warnings: [],
      pagesChecked: 0,
    };
  }
  const mdPaths = await walk(dataDir);

  const errors: CheckIssue[] = [];
  const warnings: CheckIssue[] = [];
  const validPages: ParsedPage[] = [];

  for (const fullPath of mdPaths) {
    const relPath = path.relative(vaultDir, fullPath).replace(/\\/g, "/");
    let raw: string;
    try {
      raw = await readFile(fullPath, "utf-8");
    } catch (e) {
      errors.push({ file: relPath, message: `cannot read: ${(e as Error).message}` });
      continue;
    }
    let parsed: ReturnType<typeof matter>;
    try {
      parsed = matter(raw);
    } catch (e) {
      errors.push({ file: relPath, message: `frontmatter parse error: ${(e as Error).message}` });
      continue;
    }
    const data = parsed.data as Record<string, unknown>;

    const fileErrors: string[] = [];
    if (typeof data.title !== "string" || data.title.length === 0) {
      fileErrors.push("frontmatter: missing 'title' (non-empty string)");
    }
    if (
      !Array.isArray(data.tags) ||
      data.tags.length === 0 ||
      !data.tags.every((t) => typeof t === "string")
    ) {
      fileErrors.push("frontmatter: 'tags' required (non-empty string array)");
    }
    let updatedStr: string | null = null;
    if (data.updated instanceof Date) {
      updatedStr = data.updated.toISOString().slice(0, 10);
    } else if (typeof data.updated === "string") {
      updatedStr = data.updated;
    }
    if (!updatedStr || !ISO_DATE_RE.test(updatedStr)) {
      fileErrors.push("frontmatter: 'updated' required (YYYY-MM-DD)");
    }

    if (fileErrors.length > 0) {
      for (const m of fileErrors) errors.push({ file: relPath, message: m });
      continue;
    }

    const aliases = Array.isArray(data.aliases)
      ? (data.aliases.filter((a) => typeof a === "string") as string[])
      : [];

    const parent = typeof data.parent === "string" && data.parent.length > 0 ? data.parent : null;
    const prerequisites = Array.isArray(data.prerequisites)
      ? (data.prerequisites.filter(
          (p) => typeof p === "string" && p.length > 0,
        ) as string[])
      : [];

    validPages.push({
      relPath,
      slug: fileToSlug(relPath),
      title: data.title as string,
      tags: (data.tags as unknown[]).map(String),
      aliases,
      updated: updatedStr!,
      body: parsed.content,
      parent,
      prerequisites,
    });
  }

  const pageRecords: Page[] = validPages.map((p) => ({
    slug: p.slug,
    filePath: p.relPath,
    frontmatter: {
      title: p.title,
      tags: p.tags,
      aliases: p.aliases,
      video: null,
      updated: p.updated,
      parent: p.parent,
      prerequisites: p.prerequisites,
    },
    body: p.body,
  }));
  const aliasMap = buildAliasMap(pageRecords);

  for (const p of validPages) {
    const linkCounts = new Map<string, number>();
    for (const match of p.body.matchAll(WIKI_LINK_RE)) {
      const target = match[1].trim();
      const resolved = aliasMap.get(target.toLowerCase());
      if (!resolved) {
        errors.push({ file: p.relPath, message: `broken wikilink: [[${target}]]` });
      }
      linkCounts.set(target, (linkCounts.get(target) ?? 0) + 1);
    }
    for (const [target, count] of linkCounts) {
      if (count > REPEAT_LINK_THRESHOLD) {
        warnings.push({
          file: p.relPath,
          message: `[[${target}]] repeated ${count}× (>${REPEAT_LINK_THRESHOLD})`,
        });
      }
    }
  }

  const hierarchy = validateHierarchy(pageRecords, aliasMap);
  for (const e of hierarchy.errors) {
    errors.push({ file: e.page, message: `[hierarchy] ${e.detail}` });
  }
  for (const w of hierarchy.warnings) {
    warnings.push({ file: w.page, message: `[hierarchy] ${w.detail}` });
  }

  return {
    exitCode: errors.length > 0 ? 1 : 0,
    errors,
    warnings,
    pagesChecked: mdPaths.length,
  };
}

export function formatResult(r: CheckResult): string {
  const lines: string[] = [];
  const files = new Set<string>([
    ...r.errors.map((e) => e.file),
    ...r.warnings.map((w) => w.file),
  ]);
  const sorted = [...files].sort();
  for (const f of sorted) {
    lines.push(`${f}:`);
    for (const e of r.errors.filter((x) => x.file === f)) {
      lines.push(`  ERROR: ${e.message}`);
    }
    for (const w of r.warnings.filter((x) => x.file === f)) {
      lines.push(`  WARN:  ${w.message}`);
    }
  }
  if (lines.length > 0) lines.push("");
  if (r.errors.length === 0 && r.warnings.length === 0) {
    lines.push(`${r.pagesChecked} pages checked, all good ✓`);
  } else {
    lines.push(
      `${r.pagesChecked} pages checked, ${r.errors.length} error${r.errors.length === 1 ? "" : "s"}, ${r.warnings.length} warning${r.warnings.length === 1 ? "" : "s"}`,
    );
  }
  return lines.join("\n");
}

// CLI shim — only runs when executed directly (not when imported by tests).
if (require.main === module) {
  const root = path.resolve(__dirname, "..");
  const vault = path.join(root, "content");
  runCheck(vault)
    .then((r) => {
      process.stdout.write(formatResult(r) + "\n");
      process.exit(r.exitCode);
    })
    .catch((e) => {
      console.error(e);
      process.exit(2);
    });
}
