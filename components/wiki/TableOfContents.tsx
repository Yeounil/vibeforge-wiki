interface Heading {
  id: string;
  text: string;
  level: 2 | 3;
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: "\u00a0",
};

function decodeHtmlEntities(input: string): string {
  return input.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, body: string) => {
    if (body[0] === "#") {
      const codePoint = body[1] === "x" || body[1] === "X"
        ? parseInt(body.slice(2), 16)
        : parseInt(body.slice(1), 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? match;
  });
}

function extractHeadings(html: string): Heading[] {
  const re = /<h([23])\s+id="([^"]+)"[^>]*>([\s\S]*?)<\/h\1>/g;
  const out: Heading[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const level = Number(m[1]) as 2 | 3;
    const id = m[2];
    const text = decodeHtmlEntities(m[3].replace(/<[^>]+>/g, "")).trim();
    out.push({ id, text, level });
  }
  return out;
}

interface Props {
  bodyHtml: string;
}

export function TableOfContents({ bodyHtml }: Props) {
  const items = extractHeadings(bodyHtml);
  if (items.length === 0) return null;
  return (
    <nav aria-label="Table of contents" className="text-sm">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)] mb-2">
        목차
      </h2>
      <ul className="space-y-1">
        {items.map((h) => (
          <li key={h.id} className={h.level === 3 ? "pl-3" : ""}>
            <a
              href={`#${h.id}`}
              className="text-[var(--ink-muted)] hover:text-[var(--ink)]"
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
