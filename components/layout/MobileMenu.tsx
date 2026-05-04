"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import type { Route } from "next";
import { AuthButton } from "./AuthButton";

interface Props {
  open: boolean;
  onClose: () => void;
  isAdmin: boolean;
  /** Search component injected by SiteHeader (typically <SearchBox />). */
  children: React.ReactNode;
}

export function MobileMenu({ open, onClose, isAdmin, children }: Props) {
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const triggerElRef = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;
    // Save the element that was focused before opening (typically the
    // hamburger trigger), then move focus into the sheet's close button so
    // keyboard users land inside the modal.
    triggerElRef.current = document.activeElement;
    closeBtnRef.current?.focus();

    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      // Restore focus to the trigger when closing.
      if (triggerElRef.current instanceof HTMLElement) {
        triggerElRef.current.focus();
      }
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Mobile menu"
      className="lg:hidden fixed inset-0 z-50 flex justify-end"
    >
      <button
        type="button"
        aria-label="Close menu (backdrop)"
        data-testid="mobilemenu-backdrop"
        tabIndex={-1}
        className="absolute inset-0 bg-[var(--overlay-scrim)]"
        onClick={onClose}
      />
      <div className="relative w-[80%] max-w-sm bg-[var(--canvas)] border-l border-[var(--hairline)] shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--hairline)]">
          <span className="font-mono uppercase text-[11px] tracking-[0.22em] text-[var(--ink-muted)]">
            메뉴
          </span>
          <button
            ref={closeBtnRef}
            type="button"
            aria-label="Close menu"
            onClick={onClose}
            className="min-h-[var(--touch-target)] min-w-[var(--touch-target)] flex items-center justify-center text-[var(--ink-muted)] hover:text-[var(--ink)]"
          >
            ✕
          </button>
        </div>

        <div className="px-4 py-3 border-b border-[var(--hairline)]">
          {children}
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-2">
          <ul className="space-y-1">
            <li>
              <Link
                href={"/about" as Route}
                onClick={onClose}
                className="flex items-center min-h-[var(--touch-target)] px-3 rounded-[var(--r-md)] text-[var(--ink)] hover:bg-[var(--hairline-soft)]"
              >
                ℹ️&nbsp; About
              </Link>
            </li>
            {isAdmin && (
              <li>
                <Link
                  href={"/admin" as Route}
                  onClick={onClose}
                  className="flex items-center min-h-[var(--touch-target)] px-3 rounded-[var(--r-md)] text-[var(--ink)] hover:bg-[var(--hairline-soft)]"
                >
                  🛡️&nbsp; Admin
                </Link>
              </li>
            )}
          </ul>
        </nav>

        <div className="px-4 py-3 border-t border-[var(--hairline)]">
          <AuthButton />
        </div>
      </div>
    </div>
  );
}
