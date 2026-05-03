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
  page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));

  await page.goto(`http://localhost:${port}/wiki/graph`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('[data-testid="graph-canvas"] canvas', { timeout: 15000 });
  await page.waitForTimeout(8000);

  const probe = await page.evaluate(() => {
    const css = getComputedStyle(document.documentElement);
    const tokens = {
      "--cat-concepts": css.getPropertyValue("--cat-concepts").trim(),
      "--cat-entities": css.getPropertyValue("--cat-entities").trim(),
      "--cat-people": css.getPropertyValue("--cat-people").trim(),
      "--cat-sources": css.getPropertyValue("--cat-sources").trim(),
      "--cat-data-handling": css.getPropertyValue("--cat-data-handling").trim(),
      "--cat-how-computers-work": css.getPropertyValue("--cat-how-computers-work").trim(),
      "--cat-code-flow": css.getPropertyValue("--cat-code-flow").trim(),
      "--cat-default": css.getPropertyValue("--cat-default").trim(),
    };
    return { tokens };
  });

  console.log("===== COLOR PROBE =====");
  console.log(JSON.stringify(probe, null, 2));

  await page.screenshot({ path: "scripts/_diag-fresh.png", fullPage: false });
} finally {
  dev.kill();
}
