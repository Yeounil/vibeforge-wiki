import { describe, it, expect } from "vitest";
import { newPostSchema, newCommentSchema, updatePostSchema, updateCommentSchema } from "./schemas";

describe("forum schemas", () => {
  it("newPostSchema accepts valid Q&A post", () => {
    const r = newPostSchema.safeParse({
      category: "qa",
      title: "How does git work?",
      body_md: "I am confused about commits.",
      tags: ["git"],
    });
    expect(r.success).toBe(true);
  });

  it("newPostSchema rejects empty title", () => {
    const r = newPostSchema.safeParse({
      category: "qa",
      title: "",
      body_md: "x",
      tags: [],
    });
    expect(r.success).toBe(false);
  });

  it("newPostSchema rejects unknown category", () => {
    const r = newPostSchema.safeParse({
      category: "bogus",
      title: "ok",
      body_md: "x",
      tags: [],
    });
    expect(r.success).toBe(false);
  });

  it("newPostSchema trims and bounds body length", () => {
    const r = newPostSchema.safeParse({
      category: "general",
      title: "  hi  ",
      body_md: "ok",
      tags: [],
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.title).toBe("hi");
  });

  it("newCommentSchema requires post_id and body", () => {
    expect(newCommentSchema.safeParse({ post_id: "00000000-0000-0000-0000-000000000000", body_md: "yo" }).success).toBe(true);
    expect(newCommentSchema.safeParse({ post_id: "not-a-uuid", body_md: "yo" }).success).toBe(false);
    expect(newCommentSchema.safeParse({ post_id: "00000000-0000-0000-0000-000000000000", body_md: "" }).success).toBe(false);
  });
});

describe("updatePostSchema", () => {
  const valid = {
    id: "00000000-0000-0000-0000-000000000001",
    title: "edited title",
    body_md: "edited body",
    tags: ["git"],
  };

  it("accepts valid update", () => {
    expect(updatePostSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects non-uuid id", () => {
    expect(updatePostSchema.safeParse({ ...valid, id: "nope" }).success).toBe(false);
  });

  it("rejects empty title", () => {
    expect(updatePostSchema.safeParse({ ...valid, title: "" }).success).toBe(false);
  });

  it("rejects body over 20000 chars", () => {
    expect(
      updatePostSchema.safeParse({ ...valid, body_md: "a".repeat(20001) }).success
    ).toBe(false);
  });

  it("trims title", () => {
    const r = updatePostSchema.safeParse({ ...valid, title: "  hi  " });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.title).toBe("hi");
  });
});

describe("updateCommentSchema", () => {
  const valid = {
    id: "00000000-0000-0000-0000-000000000002",
    body_md: "edited",
  };
  it("accepts valid update", () => {
    expect(updateCommentSchema.safeParse(valid).success).toBe(true);
  });
  it("rejects non-uuid id", () => {
    expect(updateCommentSchema.safeParse({ ...valid, id: "nope" }).success).toBe(false);
  });
  it("rejects empty body", () => {
    expect(updateCommentSchema.safeParse({ ...valid, body_md: "" }).success).toBe(false);
  });
});
