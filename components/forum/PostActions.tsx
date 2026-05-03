"use client";

import Link from "next/link";
import type { Route } from "next";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deletePostAction } from "@/lib/forum/actions";

interface Props {
  postId: string;
  canEdit: boolean;
  canDelete: boolean;
}

export function PostActions({ postId, canEdit, canDelete }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  if (!canEdit && !canDelete) return null;

  return (
    <div className="flex gap-2 text-sm">
      {canEdit && (
        <Link
          href={`/forum/post/${postId}/edit` as Route}
          className="text-[var(--ink-muted)] hover:text-[var(--ink)] underline"
        >
          수정
        </Link>
      )}
      {canDelete && (
        <button
          type="button"
          disabled={isPending}
          className="text-[var(--ink-muted)] hover:text-red-600 underline disabled:opacity-50"
          onClick={() => {
            if (!window.confirm("정말 삭제하시겠어요? 댓글까지 함께 사라져요.")) return;
            startTransition(async () => {
              const r = await deletePostAction(postId);
              if (!r.ok) {
                window.alert(r.error ?? "삭제에 실패했어요.");
                return;
              }
              router.push("/forum");
              router.refresh();
            });
          }}
        >
          {isPending ? "삭제 중…" : "삭제"}
        </button>
      )}
    </div>
  );
}
