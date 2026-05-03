"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import type { Route } from "next";

interface Props {
  pathname: string;
}

function readEnv() {
  const repo = process.env.NEXT_PUBLIC_GISCUS_REPO;
  const repoId = process.env.NEXT_PUBLIC_GISCUS_REPO_ID;
  const category = process.env.NEXT_PUBLIC_GISCUS_CATEGORY;
  const categoryId = process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID;
  if (!repo || !repoId || !category || !categoryId) return null;
  return { repo, repoId, category, categoryId };
}

export function GiscusEmbed({ pathname }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const injectedRef = useRef(false);
  const env = readEnv();

  useEffect(() => {
    if (!env) return;
    if (injectedRef.current) return;
    if (!containerRef.current) return;

    const script = document.createElement("script");
    script.src = "https://giscus.app/client.js";
    script.async = true;
    script.crossOrigin = "anonymous";
    script.setAttribute("data-repo", env.repo);
    script.setAttribute("data-repo-id", env.repoId);
    script.setAttribute("data-category", env.category);
    script.setAttribute("data-category-id", env.categoryId);
    script.setAttribute("data-mapping", "pathname");
    script.setAttribute("data-strict", "1");
    script.setAttribute("data-input-position", "bottom");
    script.setAttribute("data-theme", "preferred_color_scheme");
    script.setAttribute("data-lang", "ko");
    script.setAttribute("data-loading", "lazy");
    containerRef.current.appendChild(script);
    injectedRef.current = true;
  }, [env, pathname]);

  if (!env) return null;

  return (
    <section className="mt-10 bg-[var(--canvas)] border border-[var(--hairline)] rounded-[var(--r-md)] p-6">
      <h2 className="text-lg font-semibold mb-2">댓글</h2>
      <p className="text-sm text-[var(--ink-muted)] mb-4">
        더 본격적인 질문은{" "}
        <Link href={"/forum/qa" as Route} className="underline">
          Q&amp;A
        </Link>
        에서 이어가요.
      </p>
      <div ref={containerRef} data-testid="giscus-mount" />
    </section>
  );
}
