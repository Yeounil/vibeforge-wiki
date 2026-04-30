// components/layout/SiteHeader.tsx
import Link from "next/link";
import type { Route } from "next";
import { AuthButton } from "./AuthButton";

interface Props {
  searchSlot?: React.ReactNode;
}

export function SiteHeader({ searchSlot }: Props) {
  return (
    <header className="flex items-center gap-6 px-6 py-4 bg-[var(--surface-card)] rounded-[var(--radius-card)] shadow-[var(--surface-shadow)]">
      <Link href="/" className="font-bold text-lg text-[var(--text-primary)]">
        VibeForge
      </Link>
      <nav className="flex gap-4 text-sm text-[var(--text-secondary)]">
        <Link href="/wiki" className="hover:text-[var(--text-primary)]">Wiki</Link>
        <Link href={"/forum" as Route} className="hover:text-[var(--text-primary)]">Forum</Link>
        <Link href={"/about" as Route} className="hover:text-[var(--text-primary)]">About</Link>
      </nav>
      {searchSlot && <div className="flex-1 max-w-md">{searchSlot}</div>}
      <div className={searchSlot ? "" : "ml-auto"}>
        <AuthButton />
      </div>
    </header>
  );
}
