import { describe, it, expect } from "vitest";
import { fileToSlug, slugToFilePath } from "./slug";

describe("fileToSlug", () => {
  it("strips data/ prefix and .md suffix", () => {
    expect(fileToSlug("data/data-handling/what-is-an-index.md"))
      .toBe("data-handling/what-is-an-index");
  });

  it("normalizes Windows-style backslashes to forward slashes", () => {
    expect(fileToSlug("data\\code-flow\\what-is-an-array.md"))
      .toBe("code-flow/what-is-an-array");
  });

  it("throws on a path that doesn't start with data/", () => {
    expect(() => fileToSlug("foo/bar.md")).toThrow();
  });
});

describe("slugToFilePath", () => {
  it("is the inverse of fileToSlug", () => {
    expect(slugToFilePath("data-handling/what-is-an-index"))
      .toBe("data/data-handling/what-is-an-index.md");
  });
});
