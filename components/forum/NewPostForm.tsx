// components/forum/NewPostForm.tsx
"use client";

import { useState, useTransition } from "react";
import { createPostAction } from "@/lib/forum/actions";
import { CATEGORY_LABELS, FORUM_CATEGORIES, type ForumCategory } from "@/lib/forum/types";

interface Props {
  defaultCategory?: ForumCategory;
}

export function NewPostForm({ defaultCategory = "qa" }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="vf-card p-6 space-y-4"
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const result = await createPostAction(formData);
          if (!result.ok && result.error) setError(result.error);
        });
      }}
    >
      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="category">카테고리</label>
        <select
          id="category"
          name="category"
          defaultValue={defaultCategory}
          className="w-full rounded-md border border-black/10 px-3 py-2 text-sm bg-white"
        >
          {FORUM_CATEGORIES.map((c) => (
            <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="title">제목</label>
        <input
          id="title"
          name="title"
          type="text"
          required
          maxLength={200}
          className="w-full rounded-md border border-black/10 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="body_md">본문</label>
        <textarea
          id="body_md"
          name="body_md"
          required
          rows={10}
          maxLength={20000}
          className="w-full rounded-md border border-black/10 px-3 py-2 text-sm font-mono"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="tags-input">태그 (쉼표 구분)</label>
        <input
          id="tags-input"
          type="text"
          placeholder="git, basics"
          className="w-full rounded-md border border-black/10 px-3 py-2 text-sm"
          onChange={(e) => {
            const form = e.currentTarget.form;
            if (!form) return;
            // Remove old tags hidden inputs
            form.querySelectorAll('input[name="tags"]').forEach((n) => n.remove());
            // Add a hidden input per tag
            const parts = e.currentTarget.value
              .split(",")
              .map((s) => s.trim())
              .filter((s) => s.length > 0);
            for (const tag of parts) {
              const hi = document.createElement("input");
              hi.type = "hidden";
              hi.name = "tags";
              hi.value = tag;
              form.appendChild(hi);
            }
          }}
        />
      </div>
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
      <button
        type="submit"
        disabled={isPending}
        className="px-5 py-2 rounded-full font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-50"
        style={{ background: "var(--accent-cta)" }}
      >
        {isPending ? "올리는 중…" : "올리기"}
      </button>
    </form>
  );
}
