import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

const getUser = vi.fn();
const profileSelect = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: profileSelect,
        }),
      }),
    }),
  })),
}));

import { requireAdmin } from "./require-admin";

describe("requireAdmin", () => {
  beforeEach(() => {
    getUser.mockReset();
    profileSelect.mockReset();
  });

  it("calls notFound when no user is logged in", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    await expect(requireAdmin()).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("calls notFound when logged-in user is not admin", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    profileSelect.mockResolvedValue({ data: { role: "user" }, error: null });
    await expect(requireAdmin()).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("returns user when they are admin", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "admin-1" } } });
    profileSelect.mockResolvedValue({ data: { role: "admin" }, error: null });
    const user = await requireAdmin();
    expect(user.id).toBe("admin-1");
  });
});
