import { describe, it, expect } from "vitest";
import { newPostSchema, newCommentSchema } from "./schemas";

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
