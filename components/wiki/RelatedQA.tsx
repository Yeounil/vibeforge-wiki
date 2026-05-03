// components/wiki/RelatedQA.tsx — surfaces forum posts that reference this
// wiki page. Server-rendered card following the Backlinks pattern.
import Link from "next/link";
import { CategoryBadge } from "@/components/forum/CategoryBadge";
import { ColorBlock, Eyebrow } from "@/components/ui";
import type { RelatedPost } from "@/lib/wiki-qa/queries";

interface Props {
  posts: RelatedPost[];
}

export function RelatedQA({ posts }: Props) {
  return (
    <ColorBlock variant="mint" className="mt-8">
      <Eyebrow>RELATED Q&amp;A</Eyebrow>
      <h2 className="text-xl font-medium mt-2 mb-4">관련 질문</h2>
      {posts.length === 0 ? (
        <p className="text-[var(--ink-muted)]">
          이 페이지를 인용한 토론이 아직 없어요.{" "}
          <Link href="/forum/qa" className="underline">
            Q&A에 묻기
          </Link>
        </p>
      ) : (
        <ul className="space-y-2">
          {posts.map((p) => {
            const author =
              p.author?.display_name ?? p.author?.github_login ?? "익명";
            return (
              <li key={p.id} className="space-y-1">
                <div className="flex items-center gap-2">
                  <CategoryBadge category={p.category} />
                  <Link
                    href={`/forum/post/${p.id}`}
                    className="text-[var(--ink)] hover:underline"
                  >
                    {p.title}
                  </Link>
                </div>
                <div className="text-xs text-[var(--ink-muted)]">
                  {author} · {p.created_at.slice(0, 10)}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </ColorBlock>
  );
}
