// components/layout/SiteHeader.tsx
import Link from "next/link";
import type { Route } from "next";
import { AuthButton } from "./AuthButton";
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
    <Card className="px-6 md:px-8 py-3 md:py-4 flex items-center gap-5 md:gap-7">
      <div className="flex items-center gap-3">
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

      <span
        aria-hidden="true"
        className="hidden md:block h-6 w-px bg-[var(--hairline)]"
      />

      <nav
        aria-label="Primary"
        className="flex gap-5 text-[15px] text-[var(--ink-muted)]"
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

      {searchSlot && <div className="flex-1 max-w-md">{searchSlot}</div>}
      <div className={searchSlot ? "" : "ml-auto"}>
        <AuthButton />
      </div>
    </Card>
  );
}
