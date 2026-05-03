import type { PostWithAuthor } from "@/lib/forum/types";
import { Card } from "@/components/ui";
import { PostCard } from "./PostCard";

interface Props {
  posts: PostWithAuthor[];
  emptyMessage?: string;
}

export function PostList({ posts, emptyMessage = "아직 글이 없어요." }: Props) {
  if (posts.length === 0) {
    return (
      <Card className="text-center text-[var(--ink-muted)]">
        {emptyMessage}
      </Card>
    );
  }
  return (
    <ul className="space-y-3">
      {posts.map((p) => (
        <li key={p.id}>
          <PostCard post={p} />
        </li>
      ))}
    </ul>
  );
}
