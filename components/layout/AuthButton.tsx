// components/layout/AuthButton.tsx — sign in (GitHub) / sign out toggle.
"use client";

import { useUser } from "@/lib/auth/use-user";
import { createClient } from "@/lib/supabase/browser";
import { Pill } from "@/components/ui";

export function AuthButton() {
  const { user, loading } = useUser();

  async function signIn() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
  }

  if (loading) {
    return <span className="text-sm text-[var(--ink-muted)]">…</span>;
  }

  if (user) {
    const name =
      (user.user_metadata?.user_name as string | undefined) ??
      (user.user_metadata?.name as string | undefined) ??
      user.email ??
      "user";
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="text-[var(--ink-muted)]">{name}</span>
        <Pill variant="secondary" size="sm" type="button" onClick={signOut}>
          로그아웃
        </Pill>
      </div>
    );
  }

  return (
    <Pill variant="primary" size="sm" type="button" onClick={signIn}>
      GitHub 로그인
    </Pill>
  );
}
