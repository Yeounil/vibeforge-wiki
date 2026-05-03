import Link from "next/link";
import type { Route } from "next";
import type { PostWithAuthor } from "@/lib/forum/types";
import { CategoryBadge } from "./CategoryBadge";

interface Props {
  post: PostWithAuthor;
}

export function PostCard({ post }: Props) {
  const authorName =
    post.author?.display_name ?? post.author?.github_login ?? "익명";
  return (
    <Link
      href={`/forum/post/${post.id}` as Route}
      className="block rounded-[var(--r-md)] p-4 bg-[var(--canvas)] border border-[var(--hairline)] hover:shadow-lg transition"
    >
      <div className="flex items-center gap-2 mb-2">
        <CategoryBadge category={post.category} />
        <span className="text-xs text-[var(--ink-muted)]">{authorName}</span>
        <span className="text-xs text-[var(--ink-muted)] ml-auto">
          {post.created_at.slice(0, 10)}
        </span>
      </div>
      <h3 className="font-semibold text-[var(--ink)]">{post.title}</h3>
      {post.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {post.tags.map((t) => (
            <span key={t} className="text-xs text-[var(--ink-muted)] px-1.5 py-0.5 rounded bg-black/5">
              #{t}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}
