import path from "node:path";
import { describe, expect, test } from "vitest";
import { runCheck, formatResult } from "./check-content";

const FIX = path.resolve(__dirname, "__fixtures__/check-content");

describe("runCheck", () => {
  test("valid vault → exit 0, no errors", async () => {
    const r = await runCheck(path.join(FIX, "valid"));
    expect(r.exitCode).toBe(0);
    expect(r.errors).toEqual([]);
    expect(r.pagesChecked).toBe(2);
  });

  test("missing title → exit 1, error mentions 'title'", async () => {
    const r = await runCheck(path.join(FIX, "missing-title"));
    expect(r.exitCode).toBe(1);
    expect(r.errors.length).toBeGreaterThan(0);
    expect(r.errors.some((e) => /title/i.test(e.message))).toBe(true);
  });

  test("broken wikilink → exit 1, error mentions [[ghost-page]]", async () => {
    const r = await runCheck(path.join(FIX, "broken-link"));
    expect(r.exitCode).toBe(1);
    expect(r.errors.some((e) => e.message.includes("[[ghost-page]]"))).toBe(true);
  });

  test("link repeated >5× → exit 0 but warning emitted", async () => {
    const r = await runCheck(path.join(FIX, "repeat-link"));
    expect(r.exitCode).toBe(0);
    expect(r.errors).toEqual([]);
    expect(r.warnings.length).toBeGreaterThan(0);
    expect(r.warnings.some((w) => w.message.includes("target-alias"))).toBe(true);
  });
});

describe("formatResult", () => {
  test("clean run shows 'all good'", () => {
    const out = formatResult({
      exitCode: 0,
      errors: [],
      warnings: [],
      pagesChecked: 5,
    });
    expect(out).toContain("5 pages checked");
    expect(out).toContain("all good");
  });

  test("with errors shows file path and ERROR prefix", () => {
    const out = formatResult({
      exitCode: 1,
      errors: [{ file: "data/x.md", message: "missing 'title'" }],
      warnings: [],
      pagesChecked: 1,
    });
    expect(out).toContain("data/x.md");
    expect(out).toContain("ERROR");
    expect(out).toContain("missing 'title'");
  });
});
