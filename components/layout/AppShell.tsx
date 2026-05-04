// components/layout/AppShell.tsx
import { SiteHeader } from "./SiteHeader";
import { BottomTabBar } from "./BottomTabBar";

interface Props {
  sidebar: React.ReactNode;
  main: React.ReactNode;
  right?: React.ReactNode;
  headerSearch?: React.ReactNode;
}

export function AppShell({ sidebar, main, right, headerSearch }: Props) {
  return (
    <div className="min-h-screen p-4 md:p-6 pb-[calc(64px+env(safe-area-inset-bottom))] lg:pb-6">
      <SiteHeader searchSlot={headerSearch} />

      <div className="mt-6 grid gap-6 grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)_280px]">
        <aside className="hidden lg:block" data-testid="appshell-sidebar">{sidebar}</aside>
        <main data-testid="appshell-main">{main}</main>
        {right && (
          <aside className="hidden lg:block" data-testid="appshell-right">{right}</aside>
        )}
      </div>

      <BottomTabBar />
    </div>
  );
}
