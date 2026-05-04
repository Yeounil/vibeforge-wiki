"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateCommentAction, deleteCommentAction } from "@/lib/forum/actions";

interface Props {
  id: string;
  postId: string;
  authorName: string;
  bodyMd: string;
  createdAt: string;
  canEdit: boolean;
  canDelete: boolean;
}

export function CommentItem({
  id,
  postId,
  authorName,
  bodyMd,
  createdAt,
  canEdit,
  canDelete,
}: Props) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(bodyMd);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <li className="border-t border-black/5 pt-3 first:border-0 first:pt-0">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1">
        <span className="text-sm font-medium">{authorName}</span>
        <span className="text-xs text-[var(--ink-muted)]">{createdAt.slice(0, 10)}</span>
        {(canEdit || canDelete) && !isEditing && (
          <span className="basis-full sm:basis-auto sm:ml-auto flex gap-2 text-xs -mx-2">
            {canEdit && (
              <button
                type="button"
                className="px-2 min-h-[var(--touch-target)] inline-flex items-center text-[var(--ink-muted)] hover:text-[var(--ink)] focus-visible:text-[var(--ink)] underline rounded-[var(--r-sm)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-from)]"
                onClick={() => {
                  setError(null);
                  setDraft(bodyMd);
                  setIsEditing(true);
                }}
              >
                수정
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                disabled={isPending}
                className="px-2 min-h-[var(--touch-target)] inline-flex items-center text-[var(--ink-muted)] hover:text-red-600 focus-visible:text-red-600 underline disabled:opacity-50 rounded-[var(--r-sm)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
                onClick={() => {
                  if (!window.confirm("이 댓글을 삭제할까요?")) return;
                  startTransition(async () => {
                    const r = await deleteCommentAction(id, postId);
                    if (!r.ok) {
                      window.alert(r.error ?? "삭제에 실패했어요.");
                      return;
                    }
                    router.refresh();
                  });
                }}
              >
                삭제
              </button>
            )}
          </span>
        )}
      </div>
      {!isEditing ? (
        <p className="text-sm whitespace-pre-wrap">{bodyMd}</p>
      ) : (
        <form
          className="space-y-2"
          action={(formData) => {
            setError(null);
            startTransition(async () => {
              const r = await updateCommentAction(formData);
              if (!r.ok) {
                setError(r.error ?? "수정에 실패했어요.");
                return;
              }
              setIsEditing(false);
              router.refresh();
            });
          }}
        >
          <input type="hidden" name="id" value={id} />
          <textarea
            name="body_md"
            required
            rows={3}
            maxLength={5000}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="w-full bg-[var(--canvas)] text-[var(--ink)] border border-[var(--hairline)] rounded-[var(--r-md)] px-[var(--s-sm)] py-[var(--s-xs)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-from)] focus:border-transparent text-sm"
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="text-xs px-2 py-1 rounded-[var(--r-sm)] bg-[var(--brand-from)] text-white disabled:opacity-50"
            >
              {isPending ? "저장 중…" : "저장"}
            </button>
            <button
              type="button"
              className="text-xs px-2 py-1 rounded-[var(--r-sm)] border border-[var(--hairline)]"
              onClick={() => {
                setIsEditing(false);
                setError(null);
              }}
            >
              취소
            </button>
          </div>
        </form>
      )}
    </li>
  );
}
