// lib/forum/queries.test.ts — tests against a manually-stubbed SupabaseClient.
// We don't pull in the full @supabase/supabase-js types here — the queries
// module only uses a small chainable subset. The stub re-implements just that.
import { describe, it, expect } from "vitest";
import { listPosts, getPost, listComments } from "./queries";

interface StubResult { data: unknown; error: unknown }
function stub(result: StubResult) {
  // Builds a chainable query object. Every method returns `this`; the await
  // value resolves to `result`.
  const obj: Record<string, unknown> = {
    select: () => obj,
    order: () => obj,
    limit: () => obj,
    eq: () => obj,
    maybeSingle: () => Promise.resolve(result),
    then: (onFulfilled: (v: StubResult) => unknown) => Promise.resolve(result).then(onFulfilled),
  };
  return obj;
}
function client(result: StubResult) {
  return {
    from: () => stub(result),
  } as unknown as Parameters<typeof listPosts>[0];
}

describe("forum queries", () => {
  it("listPosts returns rows on success", async () => {
    const rows = [
      { id: "a", category: "qa", title: "t", body_md: "b", author_id: "u", tags: [], created_at: "2026-05-01", updated_at: "2026-05-01", author: null },
    ];
    const result = await listPosts(client({ data: rows, error: null }));
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("a");
  });

  it("listPosts throws on error", async () => {
    await expect(listPosts(client({ data: null, error: { message: "boom" } }))).rejects.toEqual({ message: "boom" });
  });

  it("getPost returns null when not found", async () => {
    const r = await getPost(client({ data: null, error: null }), "missing-id");
    expect(r).toBeNull();
  });

  it("listComments returns comments array", async () => {
    const rows = [
      { id: "c1", post_id: "p", body_md: "hi", author_id: "u", created_at: "x", updated_at: "x", author: null },
    ];
    const r = await listComments(client({ data: rows, error: null }), "p");
    expect(r[0].id).toBe("c1");
  });
});
