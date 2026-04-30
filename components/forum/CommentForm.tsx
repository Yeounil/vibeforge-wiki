// components/forum/CommentForm.tsx
"use client";

import { useState, useTransition, useRef } from "react";
import { createCommentAction } from "@/lib/forum/actions";

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
        rows={3}
        maxLength={5000}
        placeholder="댓글을 입력하세요…"
        className="w-full rounded-md border border-black/10 px-3 py-2 text-sm"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="px-4 py-1.5 rounded-full text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-50"
        style={{ background: "var(--accent-cta)" }}
      >
        {isPending ? "올리는 중…" : "댓글 달기"}
      </button>
    </form>
  );
}
