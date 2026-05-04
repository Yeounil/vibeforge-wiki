"use client";

import { useState, type RefObject } from "react";
import { useActiveHeading } from "./useActiveHeading";

interface Heading {
  id: string;
  text: string;
  level: 2 | 3;
}

interface Props {
  /** Wiki page title shown in the sticky bar's left crumb. */
  title: string;
  headings: Heading[];
  /** Ref to the article element containing the rendered headings. */
  containerRef: RefObject<HTMLElement | null>;
}

const BAR_H = 36;

export function MobileStickyTOC({ title, headings, containerRef }: Props) {
  const activeId = useActiveHeading(containerRef);
  const [open, setOpen] = useState(false);

  if (headings.length < 3) return null;

  const active = headings.find((h) => h.id === activeId) ?? headings[0];

  return (
    <nav
      aria-label="목차 (모바일)"
      className="lg:hidden sticky top-0 z-30 -mx-6 sm:-mx-8 mb-4 bg-[var(--canvas)]/95 backdrop-blur border-b border-[var(--hairline)]"
      style={{ height: BAR_H }}
    >
      <button
        type="button"
        aria-label="목차 열기"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="flex items-center justify-between w-full h-full px-4 text-[13px] gap-3"
      >
        <span className="truncate text-[var(--ink-muted)]">
          {title} <span aria-hidden="true">›</span>
        </span>
        <span className="flex items-center gap-1 text-[var(--brand-from)] font-medium truncate min-w-0">
          <span className="truncate">{active.text}</span>
          <span aria-hidden="true">▼</span>
        </span>
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close TOC"
            data-testid="mobiletoc-backdrop"
            className="fixed inset-0 z-40 bg-[var(--overlay-scrim)]"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="목차"
            className="fixed left-0 right-0 bottom-0 z-50 max-h-[60vh] overflow-y-auto bg-[var(--canvas)] border-t border-[var(--hairline)] rounded-t-2xl shadow-2xl pb-[env(safe-area-inset-bottom)]"
          >
            <div className="flex justify-center pt-2 pb-1" aria-hidden="true">
              <span className="block w-10 h-1 rounded-full bg-[var(--hairline)]" />
            </div>
            <h2 className="px-4 pt-1 pb-2 text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
              목차
            </h2>
            <ul className="px-2 pb-2">
              {headings.map((h) => (
                <li key={h.id} className={h.level === 3 ? "pl-4" : ""}>
                  <a
                    href={`#${h.id}`}
                    onClick={() => setOpen(false)}
                    aria-current={h.id === active.id ? "location" : undefined}
                    className={`flex items-center min-h-[var(--touch-target)] px-3 rounded-[var(--r-md)] text-sm ${
                      h.id === active.id
                        ? "text-[var(--brand-from)] font-medium"
                        : "text-[var(--ink-muted)]"
                    }`}
                  >
                    {h.text}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </nav>
  );
}
