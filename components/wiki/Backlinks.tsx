import Link from "next/link";
import type { Route } from "next";

interface Props {
  slugs: string[];
  titleMap: Record<string, string>;
}

export function Backlinks({ slugs, titleMap }: Props) {
  if (slugs.length === 0) return null;
  return (
    <aside aria-label="Backlinks" className="mt-8 border-t pt-4">
      <h2 className="text-sm font-semibold mb-2">이 페이지를 인용한 곳</h2>
      <ul className="list-disc pl-6">
        {slugs.map((slug) => (
          <li key={slug}>
            <Link href={`/wiki/${slug}` as Route} className="underline">
              {titleMap[slug] ?? slug}
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
