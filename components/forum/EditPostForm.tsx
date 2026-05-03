"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Route } from "next";
import { updatePostAction } from "@/lib/forum/actions";
import { Pill, Card } from "@/components/ui";
import { PostFormFields } from "./PostFormFields";
import type { ForumCategory } from "@/lib/forum/types";

interface Props {
  postId: string;
  category: ForumCategory;
  title: string;
  body: string;
  tags: string[];
}

export function EditPostForm({ postId, category, title, body, tags }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const result = await updatePostAction(formData);
          if (!result.ok && result.error) {
            setError(result.error);
            return;
          }
          router.push(`/forum/post/${postId}`);
          router.refresh();
        });
      }}
    >
      <input type="hidden" name="id" value={postId} />
      <Card className="space-y-4">
        <PostFormFields
          defaultCategory={category}
          defaultTitle={title}
          defaultBody={body}
          defaultTags={tags}
          lockedCategory
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <Pill type="submit" variant="primary" size="sm" disabled={isPending} className="disabled:opacity-50">
            {isPending ? "저장 중…" : "저장"}
          </Pill>
          <Pill href={`/forum/post/${postId}` as Route} variant="secondary" size="sm">
            취소
          </Pill>
        </div>
      </Card>
    </form>
  );
}
