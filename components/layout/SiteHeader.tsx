// components/layout/SiteHeader.tsx
import Link from "next/link";
import type { Route } from "next";
import { AuthButton } from "./AuthButton";
import { Card } from "@/components/ui";

interface Props { searchSlot?: React.ReactNode; }

export function SiteHeader({ searchSlot }: Props) {
  return (
    <Card className="!p-0 px-6 py-4 flex items-center gap-6">
      <Link href="/" className="font-bold text-lg text-[var(--ink)]">
        VibeForge
      </Link>
      <nav className="flex gap-4 text-sm text-[var(--ink-muted)]">
        <Link href="/wiki" className="hover:text-[var(--ink)]">Wiki</Link>
        <Link href={"/forum" as Route} className="hover:text-[var(--ink)]">Forum</Link>
        <Link href={"/about" as Route} className="hover:text-[var(--ink)]">About</Link>
      </nav>
      {searchSlot && <div className="flex-1 max-w-md">{searchSlot}</div>}
      <div className={searchSlot ? "" : "ml-auto"}>
        <AuthButton />
      </div>
    </Card>
  );
}
