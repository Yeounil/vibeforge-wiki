"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";

interface Tab {
  href: Route;
  label: string;
  icon: string;
  /** Path prefixes that count as "active" for this tab. resolveActive() picks
   *  the longest matching prefix across all tabs so /wiki/graph correctly
   *  beats /wiki when both match. */
  matches: string[];
}

const TABS: Tab[] = [
  { href: "/wiki" as Route,       label: "Wiki",  icon: "📖", matches: ["/wiki"] },
  { href: "/forum" as Route,      label: "Forum", icon: "💬", matches: ["/forum"] },
  { href: "/wiki/graph" as Route, label: "Graph", icon: "🕸",  matches: ["/wiki/graph"] },
  { href: "/about" as Route,      label: "About", icon: "ℹ️", matches: ["/about"] },
];

function resolveActive(pathname: string): Tab | null {
  let best: { tab: Tab; len: number } | null = null;
  for (const tab of TABS) {
    for (const prefix of tab.matches) {
      if (pathname === prefix || pathname.startsWith(prefix + "/")) {
        if (!best || prefix.length > best.len) {
          best = { tab, len: prefix.length };
        }
      }
    }
  }
  return best?.tab ?? null;
}

export function BottomTabBar() {
  const pathname = usePathname() ?? "/";
  const active = resolveActive(pathname);
  return (
    <nav
      aria-label="Bottom navigation"
      className="lg:hidden fixed inset-x-0 bottom-0 z-40 bg-[var(--canvas)] border-t border-[var(--hairline)] pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="flex">
        {TABS.map((tab) => {
          const isActive = active === tab;
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex flex-col items-center justify-center gap-1 min-h-[var(--touch-target)] py-2 text-[11px] font-medium ${
                  isActive
                    ? "text-[var(--brand-from)]"
                    : "text-[var(--ink-muted)]"
                }`}
              >
                <span aria-hidden="true" className="text-base leading-none">
                  {tab.icon}
                </span>
                <span>{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
