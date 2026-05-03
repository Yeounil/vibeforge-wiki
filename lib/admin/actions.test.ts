import { describe, it, expect, vi, beforeEach } from "vitest";

const { revalidatePath, requireAdmin, serviceUpdate } = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  requireAdmin: vi.fn(),
  serviceUpdate: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/lib/auth/require-admin", () => ({ requireAdmin }));
vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(() => ({
    from: () => ({
      update: serviceUpdate,
    }),
  })),
}));

import { promoteUserAction, demoteUserAction } from "./actions";

beforeEach(() => {
  revalidatePath.mockReset();
  requireAdmin.mockReset();
  serviceUpdate.mockReset();
});

describe("promoteUserAction", () => {
  it("rejects non-uuid target", async () => {
    requireAdmin.mockResolvedValue({ id: "a1" });
    const r = await promoteUserAction("not-a-uuid");
    expect(r.ok).toBe(false);
  });

  it("propagates requireAdmin throw", async () => {
    requireAdmin.mockRejectedValue(new Error("NEXT_NOT_FOUND"));
    await expect(
      promoteUserAction("00000000-0000-0000-0000-000000000001")
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("calls service-role update on success", async () => {
    requireAdmin.mockResolvedValue({ id: "a1" });
    serviceUpdate.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
    const r = await promoteUserAction("00000000-0000-0000-0000-000000000001");
    expect(r.ok).toBe(true);
    expect(serviceUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ role: "admin", promoted_by: "a1" })
    );
    expect(revalidatePath).toHaveBeenCalledWith("/admin");
  });

  it("returns error when supabase fails", async () => {
    requireAdmin.mockResolvedValue({ id: "a1" });
    serviceUpdate.mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: { message: "boom" } }),
    });
    const r = await promoteUserAction("00000000-0000-0000-0000-000000000001");
    expect(r.ok).toBe(false);
    expect(r.error).toContain("권한 변경");
  });
});

describe("demoteUserAction", () => {
  it("blocks self-demote", async () => {
    requireAdmin.mockResolvedValue({ id: "a1" });
    const r = await demoteUserAction("a1");
    expect(r.ok).toBe(false);
    expect(r.error).toContain("본인");
  });

  it("calls service-role update on success", async () => {
    requireAdmin.mockResolvedValue({ id: "a1" });
    serviceUpdate.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
    const r = await demoteUserAction("00000000-0000-0000-0000-000000000002");
    expect(r.ok).toBe(true);
    expect(serviceUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ role: "user", promoted_at: null, promoted_by: null })
    );
  });
});
