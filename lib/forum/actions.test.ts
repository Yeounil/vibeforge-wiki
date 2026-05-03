import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));

const getUser = vi.fn();
const fromMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser },
    from: fromMock,
  })),
}));
vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(() => ({ from: fromMock })),
}));
vi.mock("@/lib/wiki-qa/sync", () => ({
  syncWikiRefs: vi.fn(async () => []),
}));

import {
  updatePostAction,
  deletePostAction,
  updateCommentAction,
  deleteCommentAction,
} from "./actions";
import { revalidatePath } from "next/cache";

function makeFormData(entries: Record<string, string | string[]>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) {
    if (Array.isArray(v)) {
      for (const item of v) fd.append(k, item);
    } else {
      fd.append(k, v);
    }
  }
  return fd;
}

beforeEach(() => {
  vi.mocked(revalidatePath).mockReset();
  getUser.mockReset();
  fromMock.mockReset();
});

describe("updatePostAction", () => {
  it("rejects when not logged in", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const r = await updatePostAction(
      makeFormData({
        id: "00000000-0000-0000-0000-000000000001",
        title: "t",
        body_md: "b",
      })
    );
    expect(r.ok).toBe(false);
    expect(r.error).toContain("로그인");
  });

  it("rejects invalid input", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const r = await updatePostAction(
      makeFormData({ id: "not-a-uuid", title: "t", body_md: "b" })
    );
    expect(r.ok).toBe(false);
  });

  it("returns supabase error on update failure", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    fromMock.mockReturnValueOnce({
      select: () => ({
        eq: () => ({
          single: vi.fn().mockResolvedValue({
            data: { category: "qa", body_md: "old" },
            error: null,
          }),
        }),
      }),
    });
    fromMock.mockReturnValueOnce({
      update: () => ({
        eq: () => ({
          select: () => ({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: "denied" },
            }),
          }),
        }),
      }),
    });
    const r = await updatePostAction(
      makeFormData({
        id: "00000000-0000-0000-0000-000000000001",
        title: "t",
        body_md: "b",
      })
    );
    expect(r.ok).toBe(false);
    expect(r.error).toBe("denied");
  });
});

describe("deletePostAction", () => {
  it("rejects when not logged in", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const r = await deletePostAction("00000000-0000-0000-0000-000000000001");
    expect(r.ok).toBe(false);
  });

  it("rejects non-uuid id", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const r = await deletePostAction("not-a-uuid");
    expect(r.ok).toBe(false);
  });
});

describe("updateCommentAction", () => {
  it("rejects when not logged in", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const r = await updateCommentAction(
      makeFormData({
        id: "00000000-0000-0000-0000-000000000002",
        body_md: "x",
      })
    );
    expect(r.ok).toBe(false);
  });

  it("rejects empty body", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const r = await updateCommentAction(
      makeFormData({
        id: "00000000-0000-0000-0000-000000000002",
        body_md: "",
      })
    );
    expect(r.ok).toBe(false);
  });
});

describe("deleteCommentAction", () => {
  it("rejects when not logged in", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const r = await deleteCommentAction(
      "00000000-0000-0000-0000-000000000002",
      "00000000-0000-0000-0000-000000000003"
    );
    expect(r.ok).toBe(false);
  });

  it("rejects non-uuid", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const r = await deleteCommentAction("nope", "also-nope");
    expect(r.ok).toBe(false);
  });
});
