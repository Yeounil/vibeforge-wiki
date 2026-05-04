// components/layout/AppShell.tsx
// BottomTabBar is mounted in the root layout (app/layout.tsx) so every page
// gets it — including pages that bypass AppShell (/about, /wiki/graph, /).
// The body's pb-[64px+safe-area] also lives at root.
import { SiteHeader } from "./SiteHeader";

interface Props {
  sidebar: React.ReactNode;
  main: React.ReactNode;
  right?: React.ReactNode;
  headerSearch?: React.ReactNode;
}

export function AppShell({ sidebar, main, right, headerSearch }: Props) {
  return (
    <div className="min-h-screen p-4 md:p-6">
      <SiteHeader searchSlot={headerSearch} />

      <div className="mt-6 grid gap-6 grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)_280px]">
        <aside className="hidden lg:block" data-testid="appshell-sidebar">{sidebar}</aside>
        <main data-testid="appshell-main">{main}</main>
        {right && (
          <aside className="hidden lg:block" data-testid="appshell-right">{right}</aside>
        )}
      </div>
    </div>
  );
}
