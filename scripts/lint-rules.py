#!/usr/bin/env python3
"""Lint vibeforge-wiki content rules. See ../CLAUDE.md for the rules.

Usage (from content/ root):
    python scripts/lint-rules.py

Exit code 0 = all rules pass, 1 = at least one violation.
"""

import os
import re
import sys

ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', 'data'))
SOURCES = os.path.join(ROOT, 'sources')
FOLDERS = ['concepts', 'entities', 'people', 'sources']

# Rule 1: source titles must NOT contain course-numbering prefixes.
FORBIDDEN_TITLE_PATTERNS = [
    (re.compile(r'\b\d+\s*주차\b'), 'N주차 (week number)'),
    (re.compile(r'\bLec\s*\d+\b', re.IGNORECASE), 'Lec N (lecture number)'),
    (re.compile(r'(?:강의|실습)\s*(?:P\s*-?\s*)?\d+'), '강의/실습 NN (course number)'),
    (re.compile(r'\bCh(?:apter)?\s*\d+', re.IGNORECASE), 'Ch N (chapter number)'),
]

# Rule 2: directories that must NOT exist under data/ (private/raw content).
FORBIDDEN_DIRS = ['notes', 'projects', 'raw']

# Rule 3: files that must NOT exist at data/ root (private workspace meta).
FORBIDDEN_FILES = ['log.md', 'index.md', 'llm-wiki.md']

# Wiki-link extraction
WIKI_LINK_RE = re.compile(r'\[\[([^\[\]\n]+?)\]\]')
CODE_FENCE_RE = re.compile(r'```.*?```', re.DOTALL)
INLINE_CODE_RE = re.compile(r'`[^`\n]*`')


def parse_title(content: str) -> str | None:
    """Extract the `title:` value from frontmatter. Quotes stripped."""
    m = re.search(r'^title:\s*(.+?)\s*$', content, re.MULTILINE)
    if not m:
        return None
    val = m.group(1).strip()
    if (val.startswith('"') and val.endswith('"')) or (val.startswith("'") and val.endswith("'")):
        val = val[1:-1]
    return val


def parse_aliases(content: str) -> list[str]:
    """Extract `aliases:` list from frontmatter. Supports inline list `[a, b]`."""
    m = re.search(r'^aliases:\s*\[(.+?)\]\s*$', content, re.MULTILINE)
    if not m:
        return []
    items = []
    for raw in m.group(1).split(','):
        v = raw.strip().strip('"').strip("'")
        if v:
            items.append(v)
    return items


def build_link_index() -> dict[str, str]:
    """Map lowercased {slug, title, aliases...} -> canonical slug."""
    index: dict[str, str] = {}
    for folder in FOLDERS:
        fpath = os.path.join(ROOT, folder)
        if not os.path.isdir(fpath):
            continue
        for fname in os.listdir(fpath):
            if not fname.endswith('.md'):
                continue
            slug = fname[:-3]
            with open(os.path.join(fpath, fname), encoding='utf-8-sig') as f:
                content = f.read()
            keys = [slug]
            t = parse_title(content)
            if t:
                keys.append(t)
            keys.extend(parse_aliases(content))
            for k in keys:
                index[k.lower()] = slug
    return index


def extract_wiki_links(content: str) -> list[str]:
    """Find all [[target]] / [[target|display]] / [[target#anchor]] targets."""
    cleaned = CODE_FENCE_RE.sub('', content)
    cleaned = INLINE_CODE_RE.sub('', cleaned)
    targets = []
    for m in WIKI_LINK_RE.finditer(cleaned):
        raw = m.group(1).split('|', 1)[0].split('#', 1)[0].strip()
        if raw:
            targets.append(raw)
    return targets


def check_titles() -> list[str]:
    errors = []
    if not os.path.isdir(SOURCES):
        return errors
    for fname in sorted(os.listdir(SOURCES)):
        if not fname.endswith('.md'):
            continue
        with open(os.path.join(SOURCES, fname), encoding='utf-8-sig') as f:
            content = f.read()
        title = parse_title(content)
        if title is None:
            errors.append(f'sources/{fname}: missing `title:` in frontmatter')
            continue
        for pattern, label in FORBIDDEN_TITLE_PATTERNS:
            if pattern.search(title):
                errors.append(f'sources/{fname}: title contains {label} -> "{title}"')
                break
    return errors


def check_forbidden_paths() -> list[str]:
    errors = []
    for d in FORBIDDEN_DIRS:
        if os.path.isdir(os.path.join(ROOT, d)):
            errors.append(f'data/{d}/: forbidden directory (private/raw content)')
    for f in FORBIDDEN_FILES:
        if os.path.isfile(os.path.join(ROOT, f)):
            errors.append(f'data/{f}: forbidden file (private workspace meta)')
    return errors


def check_backlinks() -> list[str]:
    """Each [[wiki-link]] must resolve to an existing page (slug/title/alias)."""
    errors = []
    index = build_link_index()
    for folder in FOLDERS:
        fpath = os.path.join(ROOT, folder)
        if not os.path.isdir(fpath):
            continue
        for fname in sorted(os.listdir(fpath)):
            if not fname.endswith('.md'):
                continue
            with open(os.path.join(fpath, fname), encoding='utf-8-sig') as f:
                content = f.read()
            seen = set()
            for target in extract_wiki_links(content):
                key = target.lower()
                if key in seen:
                    continue
                seen.add(key)
                if key not in index:
                    errors.append(
                        f'{folder}/{fname}: broken [[{target}]] - no matching slug/title/alias'
                    )
    return errors


def main() -> int:
    errors = check_titles() + check_forbidden_paths() + check_backlinks()
    out = sys.stdout.buffer
    if errors:
        for e in errors:
            out.write((e + '\n').encode('utf-8'))
        out.write(f'\n{len(errors)} error(s) - see CLAUDE.md for rules\n'.encode('utf-8'))
        return 1
    out.write(b'OK - all rules pass\n')
    return 0


if __name__ == '__main__':
    sys.exit(main())
