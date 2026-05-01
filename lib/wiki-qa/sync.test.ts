import { describe, it, expect, vi } from "vitest";
import { syncWikiRefs } from "./sync";

// Hoisted mock for getAliasMap
vi.mock("@/lib/wiki/page-loader", () => ({
  getAliasMap: vi.fn(async () =>
    new Map([
      ["code-flow/async", "code-flow/async"],
      ["async", "code-flow/async"],
    ])
  ),
}));

interface Recorded {
  table: string;
  op: "delete" | "insert";
  filter?: { col: string; val: unknown };
  rows?: unknown[];
}

function makeAdmin() {
  const recorded: Recorded[] = [];
  const fromImpl = (table: string) => {
    return {
      delete() {
        const rec: Recorded = { table, op: "delete", filter: undefined };
        return {
          eq(col: string, val: unknown) {
            rec.filter = { col, val };
            recorded.push(rec);
            return Promise.resolve({ error: null });
          },
        };
      },
      insert(rows: unknown[]) {
        recorded.push({ table, op: "insert", rows });
        return Promise.resolve({ error: null });
      },
    };
  };
  const admin = { from: fromImpl } as unknown as Parameters<typeof syncWikiRefs>[0];
  return { admin, recorded };
}

describe("syncWikiRefs", () => {
  it("deletes existing refs for the post even when extracted is empty", async () => {
    const { admin, recorded } = makeAdmin();
    const slugs = await syncWikiRefs(admin, "post-1", "no wiki link here");
    expect(slugs).toEqual([]);
    expect(recorded).toEqual([
      { table: "qa_wiki_refs", op: "delete", filter: { col: "post_id", val: "post-1" } },
    ]);
  });

  it("inserts extracted slugs after deleting", async () => {
    const { admin, recorded } = makeAdmin();
    const slugs = await syncWikiRefs(admin, "post-2", "see [[async]] and /wiki/code-flow/async");
    expect(slugs).toEqual(["code-flow/async"]);
    expect(recorded).toHaveLength(2);
    expect(recorded[0]).toEqual({
      table: "qa_wiki_refs",
      op: "delete",
      filter: { col: "post_id", val: "post-2" },
    });
    expect(recorded[1]).toEqual({
      table: "qa_wiki_refs",
      op: "insert",
      rows: [{ post_id: "post-2", wiki_slug: "code-flow/async" }],
    });
  });

  it("returns extracted slug list (so caller can revalidatePath)", async () => {
    const { admin } = makeAdmin();
    const slugs = await syncWikiRefs(admin, "post-3", "[[async]]");
    expect(slugs).toEqual(["code-flow/async"]);
  });

  it("throws when delete fails", async () => {
    const errAdmin = {
      from: () => ({
        delete: () => ({
          eq: () => Promise.resolve({ error: { message: "delete boom" } }),
        }),
      }),
    } as unknown as Parameters<typeof syncWikiRefs>[0];
    await expect(
      syncWikiRefs(errAdmin, "post-x", "[[async]]")
    ).rejects.toEqual({ message: "delete boom" });
  });

  it("throws when insert fails", async () => {
    const errAdmin = {
      from: () => ({
        delete: () => ({
          eq: () => Promise.resolve({ error: null }),
        }),
        insert: () => Promise.resolve({ error: { message: "insert boom" } }),
      }),
    } as unknown as Parameters<typeof syncWikiRefs>[0];
    await expect(
      syncWikiRefs(errAdmin, "post-y", "[[async]]")
    ).rejects.toEqual({ message: "insert boom" });
  });
});
