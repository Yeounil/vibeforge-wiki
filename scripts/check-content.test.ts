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

  test("missing tags → exit 1, error mentions 'tags'", async () => {
    const r = await runCheck(path.join(FIX, "missing-tags"));
    expect(r.exitCode).toBe(1);
    expect(r.errors.some((e) => /tags/i.test(e.message))).toBe(true);
  });

  test("bad updated format → exit 1, error mentions 'updated'", async () => {
    const r = await runCheck(path.join(FIX, "bad-updated"));
    expect(r.exitCode).toBe(1);
    expect(r.errors.some((e) => /updated/i.test(e.message))).toBe(true);
  });

  test("non-existent vault → exit 2 (config error)", async () => {
    const r = await runCheck(path.join(FIX, "does-not-exist"));
    expect(r.exitCode).toBe(2);
    expect(r.pagesChecked).toBe(0);
    expect(r.errors.length).toBeGreaterThan(0);
  });

  test("valid hierarchy → exit 0", async () => {
    const r = await runCheck(path.join(FIX, "valid-hierarchy"));
    expect(r.exitCode).toBe(0);
    expect(r.errors).toEqual([]);
  });

  test("cycle → exit 1, error mentions '사이클'", async () => {
    const r = await runCheck(path.join(FIX, "cycle"));
    expect(r.exitCode).toBe(1);
    expect(r.errors.some((e) => /사이클/.test(e.message))).toBe(true);
  });

  test("cross-folder parent → exit 1, error mentions 'cross-folder'", async () => {
    const r = await runCheck(path.join(FIX, "cross-folder-parent"));
    expect(r.exitCode).toBe(1);
    expect(r.errors.some((e) => /cross-folder/.test(e.message))).toBe(true);
  });

  test("missing parent → exit 1, error mentions 'Ghost'", async () => {
    const r = await runCheck(path.join(FIX, "missing-parent"));
    expect(r.exitCode).toBe(1);
    expect(r.errors.some((e) => /Ghost/.test(e.message))).toBe(true);
  });

  test("cross-folder prereq → exit 0, warning emitted", async () => {
    const r = await runCheck(path.join(FIX, "cross-folder-prereq"));
    expect(r.exitCode).toBe(0);
    expect(r.warnings.some((w) => /cross-folder/.test(w.message))).toBe(true);
  });

  test("self parent → exit 1, error mentions '자기 자신'", async () => {
    const r = await runCheck(path.join(FIX, "self-parent"));
    expect(r.exitCode).toBe(1);
    expect(r.errors.some((e) => /자기 자신/.test(e.message))).toBe(true);
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
