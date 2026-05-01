import { describe, it, expect, vi, beforeEach } from "vitest";
import path from "node:path";
import { loadSitePage } from "./loader";

const FIXTURE_DIR = path.resolve(__dirname, "__fixtures__");

beforeEach(() => {
  vi.unstubAllEnvs();
});

describe("loadSitePage", () => {
  it("parses a valid site page (frontmatter + body)", async () => {
    const page = await loadSitePage("ok", FIXTURE_DIR);
    expect(page.name).toBe("ok");
    expect(page.frontmatter.title).toBe("Test Page");
    expect(page.body.trim()).toBe("Hello world.");
  });

  it("throws when the file is missing", async () => {
    await expect(loadSitePage("missing", FIXTURE_DIR)).rejects.toThrow(/not found/i);
  });

  it("throws when frontmatter.title is missing", async () => {
    const fs = await import("node:fs/promises");
    const os = await import("node:os");
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "vf-site-pages-"));
    await fs.writeFile(path.join(tmp, "no-title.md"), "---\nsomething: x\n---\nbody\n", "utf-8");
    await expect(loadSitePage("no-title", tmp)).rejects.toThrow(/title/i);
    await fs.rm(tmp, { recursive: true, force: true });
  });
});
