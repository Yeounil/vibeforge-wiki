import { describe, it, expect } from "vitest";
import { listPostsByWikiSlug, listWikiRefsByPost } from "./queries";

interface StubResult { data: unknown; error: unknown }

function stub(result: StubResult) {
  const obj: Record<string, unknown> = {
    select: () => obj,
    eq: () => obj,
    order: () => obj,
    limit: () => obj,
    then: (onF: (v: StubResult) => unknown) => Promise.resolve(result).then(onF),
  };
  return obj;
}

function client(result: StubResult) {
  return { from: () => stub(result) } as unknown as Parameters<
    typeof listPostsByWikiSlug
  >[0];
}

describe("wiki-qa queries", () => {
  it("listPostsByWikiSlug returns mapped posts", async () => {
    const rows = [
      {
        post: {
          id: "p1",
          category: "qa",
          title: "How does it work?",
          created_at: "2026-05-01",
          author: { display_name: "alice", github_login: "a", avatar_url: null },
        },
      },
    ];
    const result = await listPostsByWikiSlug(
      client({ data: rows, error: null }),
      "data-handling/what-is-an-index"
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: "p1", category: "qa", title: "How does it work?" });
  });

  it("listPostsByWikiSlug returns [] on null data", async () => {
    const r = await listPostsByWikiSlug(
      client({ data: null, error: null }),
      "any/slug"
    );
    expect(r).toEqual([]);
  });

  it("listPostsByWikiSlug throws on error", async () => {
    await expect(
      listPostsByWikiSlug(
        client({ data: null, error: { message: "boom" } }),
        "x"
      )
    ).rejects.toEqual({ message: "boom" });
  });

  it("listWikiRefsByPost returns slug array", async () => {
    const rows = [
      { wiki_slug: "code-flow/async" },
      { wiki_slug: "data-handling/what-is-an-index" },
    ];
    const r = await listWikiRefsByPost(
      client({ data: rows, error: null }),
      "post-1"
    );
    expect(r).toEqual([
      "code-flow/async",
      "data-handling/what-is-an-index",
    ]);
  });

  it("listWikiRefsByPost returns [] on null data", async () => {
    const r = await listWikiRefsByPost(
      client({ data: null, error: null }),
      "post-1"
    );
    expect(r).toEqual([]);
  });
});
