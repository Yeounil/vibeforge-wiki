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
    <div className="flex justify-end gap-2 text-sm -mx-2">
      {canEdit && (
        <Link
          href={`/forum/post/${postId}/edit` as Route}
          className="px-2 min-h-[var(--touch-target)] inline-flex items-center text-[var(--ink-muted)] hover:text-[var(--ink)] focus-visible:text-[var(--ink)] underline rounded-[var(--r-sm)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-from)]"
        >
          수정
        </Link>
      )}
      {canDelete && (
        <button
          type="button"
          disabled={isPending}
          className="px-2 min-h-[var(--touch-target)] inline-flex items-center text-[var(--ink-muted)] hover:text-red-600 focus-visible:text-red-600 underline disabled:opacity-50 rounded-[var(--r-sm)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
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
