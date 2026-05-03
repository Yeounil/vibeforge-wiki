import { spawn } from "child_process";
import { chromium } from "playwright";

const dev = spawn("npm", ["run", "dev"], { cwd: process.cwd(), shell: true });
let port = null;
await new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error("dev start timeout")), 90000);
  dev.stdout.on("data", (d) => {
    const s = d.toString();
    process.stdout.write(s);
    const m = s.match(/Local:\s+http:\/\/localhost:(\d+)/);
    if (m && !port) {
      port = Number(m[1]);
      clearTimeout(t);
      resolve();
    }
  });
  dev.stderr.on("data", (d) => process.stderr.write(d));
});

try {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  await page.goto(`http://localhost:${port}/wiki`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  const wikiIdx = await page.evaluate(() => {
    const main = document.querySelector('[data-testid="appshell-main"]');
    if (!main) return { error: "no main" };
    const links = Array.from(main.querySelectorAll("a")).map((a) => a.textContent?.trim()).filter(Boolean);
    return { linkCount: links.length, links: links.slice(0, 50) };
  });
  console.log("===== /wiki main links =====");
  console.log(JSON.stringify(wikiIdx, null, 2));

  await page.goto(`http://localhost:${port}/wiki/tag/database`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  const tagPage = await page.evaluate(() => {
    const main = document.querySelector('[data-testid="appshell-main"]');
    if (!main) return { error: "no main" };
    const links = Array.from(main.querySelectorAll("a")).map((a) => a.textContent?.trim()).filter(Boolean);
    return { linkCount: links.length, links: links.slice(0, 50) };
  });
  console.log("===== /wiki/tag/database main links =====");
  console.log(JSON.stringify(tagPage, null, 2));

  await page.goto(`http://localhost:${port}/wiki/concepts/Memex`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  const memexPage = await page.evaluate(() => {
    const main = document.querySelector('[data-testid="appshell-main"]');
    if (!main) return { error: "no main" };
    const h1 = main.querySelector("h1")?.textContent?.trim();
    const links = Array.from(main.querySelectorAll("a"))
      .map((a) => ({ href: a.getAttribute("href"), text: a.textContent?.trim() }))
      .filter((l) => l.href);
    return { h1, linkCount: links.length, sampleLinks: links.slice(0, 40) };
  });
  console.log("===== /wiki/concepts/Memex =====");
  console.log(JSON.stringify(memexPage, null, 2));
} finally {
  dev.kill();
}
