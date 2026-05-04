// lib/admin/actions.ts — server actions for promoting/demoting admins.
// Defense-in-depth: requireAdmin() runs before reaching for service-role.
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createServiceClient } from "@/lib/supabase/service";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

const uuid = z.string().uuid();

export async function promoteUserAction(targetId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!uuid.safeParse(targetId).success) {
    return { ok: false, error: "잘못된 요청입니다." };
  }
  const service = createServiceClient();
  const { error } = await service
    .from("profiles")
    .update({ role: "admin", promoted_at: new Date().toISOString(), promoted_by: admin.id })
    .eq("id", targetId);
  if (error) return { ok: false, error: `권한 변경에 실패했어요: ${error.message}` };
  revalidatePath("/admin");
  return { ok: true };
}

export async function demoteUserAction(targetId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = uuid.safeParse(targetId);
  if (!parsed.success) {
    return { ok: false, error: "잘못된 요청입니다." };
  }
  // Normalize before self-comparison: Postgres UUID type accepts mixed case but
  // canonicalizes to lowercase. Without normalization, an admin could submit
  // their own id with an uppercase character and self-demote into lockout.
  if (parsed.data.toLowerCase() === admin.id.toLowerCase()) {
    return { ok: false, error: "본인은 강등할 수 없어요." };
  }
  const service = createServiceClient();
  const { error } = await service
    .from("profiles")
    .update({ role: "user", promoted_at: null, promoted_by: null })
    .eq("id", targetId);
  if (error) return { ok: false, error: `권한 변경에 실패했어요: ${error.message}` };
  revalidatePath("/admin");
  return { ok: true };
}
