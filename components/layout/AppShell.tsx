// components/layout/AppShell.tsx
import { SiteHeader } from "./SiteHeader";

interface Props {
  sidebar: React.ReactNode;
  main: React.ReactNode;
  right?: React.ReactNode;
  headerSearch?: React.ReactNode;
}

export function AppShell({ sidebar, main, right, headerSearch }: Props) {
  return (
    <div className="min-h-screen p-4 md:p-6 bg-[var(--bg-gradient)]">
      <SiteHeader searchSlot={headerSearch} />

      <details className="mt-4 md:hidden vf-card">
        <summary className="px-4 py-3 cursor-pointer text-sm font-semibold">
          카테고리
        </summary>
        <div className="px-2 pb-3">{sidebar}</div>
      </details>

      <div className="mt-6 grid gap-6 grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)] lg:grid-cols-[220px_minmax(0,1fr)_280px]">
        <aside className="hidden md:block" data-testid="appshell-sidebar">{sidebar}</aside>
        <main data-testid="appshell-main">{main}</main>
        {right && (
          <aside className="hidden lg:block" data-testid="appshell-right">{right}</aside>
        )}
      </div>
    </div>
  );
}
