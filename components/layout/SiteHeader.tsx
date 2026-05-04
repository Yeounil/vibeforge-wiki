// components/layout/SiteHeader.tsx
import Link from "next/link";
import type { Route } from "next";
import { AuthButton } from "./AuthButton";
import { MobileHeaderControls } from "./MobileHeaderControls";
import { Card } from "@/components/ui";
import { Wordmark } from "@/components/brand/Wordmark";
import { createClient } from "@/lib/supabase/server";

interface Props { searchSlot?: React.ReactNode; }

async function getIsAdmin(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    return profile?.role === "admin";
  } catch {
    return false;
  }
}

export async function SiteHeader({ searchSlot }: Props) {
  const isAdmin = await getIsAdmin();
  return (
    <Card className="px-4 sm:px-6 lg:px-8 py-3 lg:py-4 flex items-center gap-3 lg:gap-7">
      <div className="flex items-center gap-3 flex-1 lg:flex-initial">
        <Link
          href="/"
          aria-label="VibeForge"
          className="text-[var(--ink)] hover:opacity-90 transition-opacity"
        >
          <Wordmark size="header" />
        </Link>
        <span
          aria-hidden="true"
          className="hidden lg:inline font-mono uppercase text-[12px] tracking-[0.22em] text-[var(--ink-muted)]"
        >
          CS · 위키 · 포럼
        </span>
      </div>

      {/* Desktop divider + nav + search + auth — hidden on mobile/tablet. */}
      <span
        aria-hidden="true"
        className="hidden lg:block h-6 w-px bg-[var(--hairline)]"
      />
      <nav
        aria-label="Primary"
        className="hidden lg:flex gap-5 text-[15px] text-[var(--ink-muted)]"
      >
        <Link href="/wiki" className="hover:text-[var(--ink)] transition-colors">
          Wiki
        </Link>
        <Link
          href={"/forum" as Route}
          className="hover:text-[var(--ink)] transition-colors"
        >
          Forum
        </Link>
        <Link
          href={"/about" as Route}
          className="hover:text-[var(--ink)] transition-colors"
        >
          About
        </Link>
        {isAdmin && (
          <Link
            href={"/admin" as Route}
            className="hover:text-[var(--ink)] transition-colors"
          >
            Admin
          </Link>
        )}
      </nav>
      {searchSlot && (
        <div className="hidden lg:block flex-1 max-w-md">{searchSlot}</div>
      )}
      <div className="hidden lg:block">
        <AuthButton />
      </div>

      {/* Mobile/tablet — hamburger that opens the sheet. */}
      <MobileHeaderControls isAdmin={isAdmin} searchSlot={searchSlot} />
    </Card>
  );
}
