"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { promoteUserAction, demoteUserAction } from "@/lib/admin/actions";
import type { AdminProfileRow } from "@/lib/admin/queries";

interface Props {
  rows: AdminProfileRow[];
  currentAdminId: string;
}

export function AdminTable({ rows, currentAdminId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleAction(targetId: string, kind: "promote" | "demote") {
    startTransition(async () => {
      const r =
        kind === "promote"
          ? await promoteUserAction(targetId)
          : await demoteUserAction(targetId);
      if (!r.ok) {
        window.alert(r.error ?? "변경에 실패했어요.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[var(--ink-muted)] border-b border-[var(--hairline)]">
            <th className="py-2 pr-4">GitHub</th>
            <th className="py-2 pr-4">표시 이름</th>
            <th className="py-2 pr-4">역할</th>
            <th className="py-2 pr-4">승격 시각</th>
            <th className="py-2 pr-4">동작</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const isSelf = r.id === currentAdminId;
            const isAdmin = r.role === "admin";
            return (
              <tr key={r.id} className="border-b border-black/5">
                <td className="py-2 pr-4">{r.github_login ? `@${r.github_login}` : "—"}</td>
                <td className="py-2 pr-4">{r.display_name ?? "—"}</td>
                <td className="py-2 pr-4">
                  <span
                    className={
                      isAdmin
                        ? "inline-block px-2 py-0.5 rounded-[var(--r-sm)] bg-[var(--accent-cta)] text-white text-xs"
                        : "text-[var(--ink-muted)] text-xs"
                    }
                  >
                    {r.role}
                  </span>
                </td>
                <td className="py-2 pr-4 text-xs text-[var(--ink-muted)]">
                  {r.promoted_at ? r.promoted_at.slice(0, 10) : "—"}
                </td>
                <td className="py-2 pr-4">
                  <button
                    type="button"
                    disabled={isPending || (isAdmin && isSelf)}
                    onClick={() => handleAction(r.id, isAdmin ? "demote" : "promote")}
                    className="text-xs px-2 py-1 rounded-[var(--r-sm)] border border-[var(--hairline)] hover:bg-[var(--canvas-soft,rgba(0,0,0,0.03))] disabled:opacity-40"
                  >
                    {isAdmin ? (isSelf ? "본인" : "강등") : "승격"}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
