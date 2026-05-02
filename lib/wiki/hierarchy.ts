import type { Page } from "./types";

export interface HierarchyTree {
  roots: string[];
  children: Record<string, string[]>;
  parents: Record<string, string>;
  prerequisites: Record<string, string[]>;
}

export type VaultHierarchy = Record<string /* topLevelFolder */, HierarchyTree>;

export type ValidationErrorKind =
  | "missing-parent"
  | "cross-folder-parent"
  | "cycle"
  | "self-parent"
  | "missing-prereq"
  | "self-prereq";

export type ValidationWarningKind = "cross-folder-prereq";

export interface ValidationError {
  page: string;
  kind: ValidationErrorKind;
  detail: string;
}

export interface ValidationWarning {
  page: string;
  kind: ValidationWarningKind;
  detail: string;
}

export interface ValidationResult {
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

function topFolder(slug: string): string {
  const idx = slug.indexOf("/");
  return idx === -1 ? slug : slug.slice(0, idx);
}

function emptyTree(): HierarchyTree {
  return { roots: [], children: {}, parents: {}, prerequisites: {} };
}

function resolveSameFolder(
  raw: string,
  ownFolder: string,
  aliasMap: Map<string, string>,
): string | null {
  const resolved = aliasMap.get(raw.toLowerCase());
  if (!resolved) return null;
  if (topFolder(resolved) !== ownFolder) return null;
  return resolved;
}

export function buildHierarchy(
  pages: Page[],
  aliasMap: Map<string, string>,
): VaultHierarchy {
  const out: VaultHierarchy = {};

  for (const p of pages) {
    const folder = topFolder(p.slug);
    if (!out[folder]) out[folder] = emptyTree();
    if (!out[folder].children[p.slug]) out[folder].children[p.slug] = [];
  }

  for (const p of pages) {
    const folder = topFolder(p.slug);
    const tree = out[folder];

    if (p.frontmatter.parent) {
      const parent = resolveSameFolder(p.frontmatter.parent, folder, aliasMap);
      if (parent && parent !== p.slug) {
        if (!tree.children[parent]) tree.children[parent] = [];
        tree.children[parent].push(p.slug);
        tree.parents[p.slug] = parent;
      }
    }

    if (p.frontmatter.prerequisites.length > 0) {
      const slugs: string[] = [];
      for (const raw of p.frontmatter.prerequisites) {
        const resolved = aliasMap.get(raw.toLowerCase());
        if (resolved && resolved !== p.slug) slugs.push(resolved);
      }
      if (slugs.length > 0) tree.prerequisites[p.slug] = slugs;
    }
  }

  // Cycle detection: pages whose parent chain loops back to themselves get
  // their parent edge stripped (so the validator can still report the cycle
  // as an error, while traversal terminates here).
  for (const folder of Object.keys(out)) {
    const tree = out[folder];
    for (const slug of Object.keys(tree.parents)) {
      let cursor: string | undefined = tree.parents[slug];
      const seen = new Set<string>([slug]);
      while (cursor) {
        if (seen.has(cursor)) {
          if (cursor === slug) {
            // slug itself is part of the cycle — strip its parent edge
            const exParent = tree.parents[slug];
            delete tree.parents[slug];
            if (exParent && tree.children[exParent]) {
              tree.children[exParent] = tree.children[exParent].filter((s) => s !== slug);
            }
          }
          // either way, terminate this traversal — another start node will handle the cycle
          break;
        }
        seen.add(cursor);
        cursor = tree.parents[cursor];
      }
    }
  }

  for (const folder of Object.keys(out)) {
    const tree = out[folder];
    for (const k of Object.keys(tree.children)) {
      tree.children[k].sort((a, b) => a.localeCompare(b, "ko"));
    }
    tree.roots = Object.keys(tree.children)
      .filter((s) => !(s in tree.parents))
      .sort((a, b) => a.localeCompare(b, "ko"));
  }

  return out;
}

export function validateHierarchy(
  pages: Page[],
  aliasMap: Map<string, string>,
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  const slugSet = new Set(pages.map((p) => p.slug));

  for (const p of pages) {
    const folder = topFolder(p.slug);
    if (p.frontmatter.parent) {
      const raw = p.frontmatter.parent;
      const resolved = aliasMap.get(raw.toLowerCase());
      if (!resolved || !slugSet.has(resolved)) {
        errors.push({
          page: p.filePath,
          kind: "missing-parent",
          detail: `parent "${raw}" — 알 수 없는 페이지`,
        });
      } else if (resolved === p.slug) {
        errors.push({
          page: p.filePath,
          kind: "self-parent",
          detail: `parent가 자기 자신입니다`,
        });
      } else if (topFolder(resolved) !== folder) {
        errors.push({
          page: p.filePath,
          kind: "cross-folder-parent",
          detail: `parent "${raw}"이 cross-folder (${topFolder(resolved)}/)`,
        });
      }
    }
    for (const raw of p.frontmatter.prerequisites) {
      const resolved = aliasMap.get(raw.toLowerCase());
      if (!resolved || !slugSet.has(resolved)) {
        errors.push({
          page: p.filePath,
          kind: "missing-prereq",
          detail: `prerequisites "${raw}" — 알 수 없는 페이지`,
        });
      } else if (resolved === p.slug) {
        errors.push({
          page: p.filePath,
          kind: "self-prereq",
          detail: `prerequisites가 자기 자신입니다`,
        });
      } else if (topFolder(resolved) !== folder) {
        warnings.push({
          page: p.filePath,
          kind: "cross-folder-prereq",
          detail: `prerequisites "${raw}"이 cross-folder (${topFolder(resolved)}/)`,
        });
      }
    }
  }

  // Cycle detection over resolved same-folder parent edges only
  const parentOf = new Map<string, string>();
  for (const p of pages) {
    if (!p.frontmatter.parent) continue;
    const folder = topFolder(p.slug);
    const resolved = resolveSameFolder(p.frontmatter.parent, folder, aliasMap);
    if (resolved && resolved !== p.slug) parentOf.set(p.slug, resolved);
  }
  const filePathBySlug = new Map(pages.map((p) => [p.slug, p.filePath]));
  for (const start of parentOf.keys()) {
    let cursor: string | undefined = parentOf.get(start);
    const seen = new Set<string>([start]);
    const path: string[] = [start];
    while (cursor) {
      if (seen.has(cursor)) {
        const cycleStart = cursor;
        const cycleIdx = path.indexOf(cycleStart);
        const cycleMembers = path.slice(cycleIdx);
        const cycleNodes = [...cycleMembers, cursor];
        const anchor = [...cycleMembers].sort()[0];
        if (start === anchor) {
          errors.push({
            page: filePathBySlug.get(start) ?? start,
            kind: "cycle",
            detail: `사이클 감지 (${cycleNodes.join(" → ")})`,
          });
        }
        break;
      }
      seen.add(cursor);
      path.push(cursor);
      cursor = parentOf.get(cursor);
    }
  }

  return { errors, warnings };
}

export function getParentChain(
  tree: VaultHierarchy,
  slug: string,
  titleMap: Record<string, string>,
): { slug: string; title: string }[] {
  const folder = topFolder(slug);
  const folderTree = tree[folder];
  if (!folderTree) return [];
  const chain: string[] = [];
  let cursor: string | undefined = folderTree.parents[slug];
  while (cursor) {
    chain.unshift(cursor);
    cursor = folderTree.parents[cursor];
  }
  return chain.map((s) => ({ slug: s, title: titleMap[s] ?? s }));
}

export function getChildItems(
  tree: VaultHierarchy,
  slug: string,
  titleMap: Record<string, string>,
): { slug: string; title: string }[] {
  const folder = topFolder(slug);
  const folderTree = tree[folder];
  if (!folderTree) return [];
  const children = folderTree.children[slug] ?? [];
  return children.map((s) => ({ slug: s, title: titleMap[s] ?? s }));
}

export function getPrereqItems(
  tree: VaultHierarchy,
  slug: string,
  titleMap: Record<string, string>,
): { slug: string; title: string }[] {
  const folder = topFolder(slug);
  const folderTree = tree[folder];
  if (!folderTree) return [];
  const items = folderTree.prerequisites[slug] ?? [];
  return items.map((s) => ({ slug: s, title: titleMap[s] ?? s }));
}
