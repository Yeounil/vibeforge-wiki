"use client";

import { useState, useTransition } from "react";
import { createPostAction } from "@/lib/forum/actions";
import { Pill, Card } from "@/components/ui";
import { PostFormFields } from "./PostFormFields";
import type { ForumCategory } from "@/lib/forum/types";

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
        <PostFormFields defaultCategory={defaultCategory} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <Pill
            type="submit"
            variant="primary"
            size="sm"
            disabled={isPending}
            className="disabled:opacity-50 w-full sm:w-auto min-h-[var(--touch-target)]"
          >
            {isPending ? "올리는 중…" : "올리기"}
          </Pill>
        </div>
      </Card>
    </form>
  );
}
