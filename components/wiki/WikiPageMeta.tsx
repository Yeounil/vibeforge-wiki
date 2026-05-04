"use client";

import { useState } from "react";

type TabId = "backlinks" | "qa" | "comments";

interface Props {
  backlinksCount: number;
  relatedQACount: number;
  backlinksSlot: React.ReactNode;
  relatedQASlot: React.ReactNode;
  commentsSlot: React.ReactNode;
}

export function WikiPageMeta({
  backlinksCount,
  relatedQACount,
  backlinksSlot,
  relatedQASlot,
  commentsSlot,
}: Props) {
  const [active, setActive] = useState<TabId>("backlinks");
  // Lazy-once: comments stays unmounted until first activation, then sticks
  // so re-clicking the tab doesn't re-fetch the Giscus iframe.
  const [commentsMounted, setCommentsMounted] = useState(false);

  function activate(tab: TabId) {
    setActive(tab);
    if (tab === "comments") setCommentsMounted(true);
  }

  return (
    <section
      aria-label="페이지 관련 정보"
      className="lg:hidden mt-8 bg-[var(--canvas)] border border-[var(--hairline)] rounded-[var(--r-md)] overflow-hidden"
    >
      <div role="tablist" aria-label="페이지 관련 정보" className="flex border-b border-[var(--hairline)]">
        <TabButton
          id="backlinks"
          active={active === "backlinks"}
          onClick={() => activate("backlinks")}
        >
          관련 위키 ({backlinksCount})
        </TabButton>
        <TabButton
          id="qa"
          active={active === "qa"}
          onClick={() => activate("qa")}
        >
          Q&amp;A ({relatedQACount})
        </TabButton>
        <TabButton
          id="comments"
          active={active === "comments"}
          onClick={() => activate("comments")}
        >
          댓글
        </TabButton>
      </div>
      <div className="p-4">
        <div role="tabpanel" hidden={active !== "backlinks"}>
          {backlinksSlot}
        </div>
        <div role="tabpanel" hidden={active !== "qa"}>
          {relatedQASlot}
        </div>
        <div role="tabpanel" hidden={active !== "comments"}>
          {commentsMounted ? commentsSlot : null}
        </div>
      </div>
    </section>
  );
}

function TabButton({
  id,
  active,
  onClick,
  children,
}: {
  id: TabId;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      id={`wpm-tab-${id}`}
      aria-selected={active}
      onClick={onClick}
      className={`flex-1 min-h-[var(--touch-target)] px-3 text-sm border-b-2 transition-colors ${
        active
          ? "border-[var(--brand-from)] text-[var(--ink)] font-medium"
          : "border-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]"
      }`}
    >
      {children}
    </button>
  );
}
