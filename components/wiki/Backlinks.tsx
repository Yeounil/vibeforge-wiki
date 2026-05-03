import Link from "next/link";
import type { Route } from "next";
import { ColorBlock, Eyebrow } from "@/components/ui";

interface Props {
  slugs: string[];
  titleMap: Record<string, string>;
}

export function Backlinks({ slugs, titleMap }: Props) {
  if (slugs.length === 0) return null;
  return (
    <ColorBlock variant="lilac" as="nav" aria-label="Backlinks" className="mt-8">
      <Eyebrow>BACKLINKS</Eyebrow>
      <h2 className="text-xl font-medium mt-2 mb-4">이 페이지를 인용한 글</h2>
      <ul className="space-y-2">
        {slugs.map((slug) => (
          <li key={slug}>
            <Link
              href={`/wiki/${slug}` as Route}
              className="text-[var(--ink-muted)] hover:text-[var(--ink)]"
            >
              {titleMap[slug] ?? slug}
            </Link>
          </li>
        ))}
      </ul>
    </ColorBlock>
  );
}
