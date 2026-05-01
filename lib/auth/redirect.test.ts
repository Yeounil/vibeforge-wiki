import { describe, expect, test } from "vitest";
import { safeRedirectPath } from "./redirect";

describe("safeRedirectPath", () => {
  test("relative path passes through", () => {
    expect(safeRedirectPath("/forum")).toBe("/forum");
    expect(safeRedirectPath("/wiki/data/code-flow/what-is-an-array")).toBe(
      "/wiki/data/code-flow/what-is-an-array",
    );
  });

  test("missing or empty input falls back to /", () => {
    expect(safeRedirectPath(null)).toBe("/");
    expect(safeRedirectPath(undefined)).toBe("/");
    expect(safeRedirectPath("")).toBe("/");
  });

  test("protocol-relative URL is rejected", () => {
    expect(safeRedirectPath("//evil.com/phish")).toBe("/");
    expect(safeRedirectPath("//evil.com")).toBe("/");
  });

  test("absolute URL is rejected", () => {
    expect(safeRedirectPath("https://evil.com")).toBe("/");
    expect(safeRedirectPath("http://evil.com/x")).toBe("/");
  });

  test("path not starting with / is rejected", () => {
    expect(safeRedirectPath("forum")).toBe("/");
    expect(safeRedirectPath("javascript:alert(1)")).toBe("/");
  });

  test("backslash variants are rejected", () => {
    expect(safeRedirectPath("/\\evil.com")).toBe("/");
    expect(safeRedirectPath("\\\\evil.com")).toBe("/");
  });

  test("query strings and fragments on relative paths are preserved", () => {
    expect(safeRedirectPath("/forum?page=2")).toBe("/forum?page=2");
    expect(safeRedirectPath("/wiki#section")).toBe("/wiki#section");
  });
});
