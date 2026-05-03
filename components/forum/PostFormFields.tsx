"use client";

import { TextInput } from "@/components/ui";
import { CATEGORY_LABELS, FORUM_CATEGORIES, type ForumCategory } from "@/lib/forum/types";

interface Props {
  defaultCategory: ForumCategory;
  defaultTitle?: string;
  defaultBody?: string;
  defaultTags?: string[];
  /** When true, the category select is disabled (edit mode). */
  lockedCategory?: boolean;
}

export function PostFormFields({
  defaultCategory,
  defaultTitle = "",
  defaultBody = "",
  defaultTags = [],
  lockedCategory = false,
}: Props) {
  const tagsCsv = defaultTags.join(", ");
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="category">카테고리</label>
        <select
          id="category"
          name="category"
          defaultValue={defaultCategory}
          disabled={lockedCategory}
          className="w-full rounded-[var(--r-md)] border border-[var(--hairline)] px-[var(--s-sm)] py-[var(--s-xs)] text-sm bg-[var(--canvas)] text-[var(--ink)] disabled:opacity-60"
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
          defaultValue={defaultTitle}
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
          defaultValue={defaultBody}
          className="w-full font-mono text-sm bg-[var(--canvas)] text-[var(--ink)] border border-[var(--hairline)] rounded-[var(--r-md)] px-[var(--s-sm)] py-[var(--s-xs)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-from)] focus:border-transparent"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="tags-input">태그 (쉼표 구분)</label>
        <TextInput
          id="tags-input"
          type="text"
          placeholder="git, basics"
          defaultValue={tagsCsv}
          className="w-full text-sm"
          onChange={(e) => {
            const form = e.currentTarget.form;
            if (!form) return;
            form.querySelectorAll('input[name="tags"]').forEach((n) => n.remove());
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
        {defaultTags.map((t) => (
          <input key={t} type="hidden" name="tags" value={t} />
        ))}
      </div>
    </div>
  );
}
