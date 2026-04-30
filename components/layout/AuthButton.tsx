// components/layout/AuthButton.tsx — sign in (GitHub) / sign out toggle.
"use client";

import { useUser } from "@/lib/auth/use-user";
import { createClient } from "@/lib/supabase/browser";

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
    return <span className="text-sm text-[var(--text-secondary)]">…</span>;
  }

  if (user) {
    const name =
      (user.user_metadata?.user_name as string | undefined) ??
      (user.user_metadata?.name as string | undefined) ??
      user.email ??
      "user";
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="text-[var(--text-secondary)]">{name}</span>
        <button
          type="button"
          onClick={signOut}
          className="px-3 py-1 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-black/10"
        >
          로그아웃
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={signIn}
      className="px-3 py-1 rounded-full text-sm font-semibold text-white shadow-sm hover:opacity-90"
      style={{ background: "var(--accent-cta)" }}
    >
      GitHub 로그인
    </button>
  );
}
