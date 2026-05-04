// components/forum/CommentForm.tsx
"use client";

import { useState, useTransition, useRef } from "react";
import { createCommentAction } from "@/lib/forum/actions";
import { Pill } from "@/components/ui";

interface Props {
  postId: string;
}

export function CommentForm({ postId }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      className="space-y-2"
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const result = await createCommentAction(formData);
          if (!result.ok && result.error) {
            setError(result.error);
            return;
          }
          formRef.current?.reset();
        });
      }}
    >
      <input type="hidden" name="post_id" value={postId} />
      <textarea
        name="body_md"
        required
        rows={4}
        maxLength={5000}
        placeholder="댓글을 입력하세요…"
        className="w-full bg-[var(--canvas)] text-[var(--ink)] border border-[var(--hairline)] rounded-[var(--r-md)] px-[var(--s-sm)] py-[var(--s-xs)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-from)] focus:border-transparent text-sm"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Pill type="submit" variant="primary" size="sm" disabled={isPending} className="disabled:opacity-50 w-full sm:w-auto min-h-[var(--touch-target)]">
        {isPending ? "올리는 중…" : "댓글 달기"}
      </Pill>
    </form>
  );
}
