// components/forum/NewPostForm.tsx
"use client";

import { useState, useTransition } from "react";
import { createPostAction } from "@/lib/forum/actions";
import { CATEGORY_LABELS, FORUM_CATEGORIES, type ForumCategory } from "@/lib/forum/types";
import { Pill, Card, TextInput } from "@/components/ui";

interface Props {
  defaultCategory?: ForumCategory;
}

export function NewPostForm({ defaultCategory = "qa" }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const result = await createPostAction(formData);
          if (!result.ok && result.error) setError(result.error);
        });
      }}
    >
      <Card className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="category">카테고리</label>
          <select
            id="category"
            name="category"
            defaultValue={defaultCategory}
            className="w-full rounded-[var(--r-md)] border border-[var(--hairline)] px-[var(--s-sm)] py-[var(--s-xs)] text-sm bg-[var(--canvas)] text-[var(--ink)]"
          >
            {FORUM_CATEGORIES.map((c) => (
              <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="title">제목</label>
          <TextInput
            id="title"
            name="title"
            type="text"
            required
            maxLength={200}
            className="w-full text-sm"
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
            className="w-full font-mono text-sm bg-[var(--canvas)] text-[var(--ink)] border border-[var(--hairline)] rounded-[var(--r-md)] px-[var(--s-sm)] py-[var(--s-xs)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-from)] focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="tags-input">태그 (쉼표 구분)</label>
          <TextInput
            id="tags-input"
            type="text"
            placeholder="git, basics"
            className="w-full text-sm"
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
        <Pill type="submit" variant="primary" size="sm" disabled={isPending} className="disabled:opacity-50">
          {isPending ? "올리는 중…" : "올리기"}
        </Pill>
      </Card>
    </form>
  );
}
