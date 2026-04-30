interface Heading {
  id: string;
  text: string;
  level: 2 | 3;
}

function extractHeadings(html: string): Heading[] {
  const re = /<h([23])\s+id="([^"]+)"[^>]*>([\s\S]*?)<\/h\1>/g;
  const out: Heading[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const level = Number(m[1]) as 2 | 3;
    const id = m[2];
    const text = m[3].replace(/<[^>]+>/g, "").trim();
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
      <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-2">
        목차
      </h2>
      <ul className="space-y-1">
        {items.map((h) => (
          <li key={h.id} className={h.level === 3 ? "pl-3" : ""}>
            <a
              href={`#${h.id}`}
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
