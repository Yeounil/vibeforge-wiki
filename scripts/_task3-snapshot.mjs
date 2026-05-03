import { spawn } from "child_process";
import { chromium } from "playwright";

const dev = spawn("npm", ["run", "dev"], { cwd: process.cwd(), shell: true });
let port = null;
await new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error("dev start timeout")), 60000);
  dev.stdout.on("data", (d) => {
    const s = d.toString();
    process.stdout.write(s);
    const m = s.match(/Local:\s+http:\/\/localhost:(\d+)/);
    if (m) { port = Number(m[1]); clearTimeout(t); resolve(); }
  });
  dev.stderr.on("data", (d) => process.stderr.write(d));
});

try {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(`pageerror: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error") errs.push(`console.error: ${m.text()}`); });
  await page.goto(`http://localhost:${port}/wiki/graph`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('[data-testid="graph-canvas"]', { timeout: 15000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: "scripts/_task3-snapshot.png", fullPage: false });
  console.log("ERRORS:", JSON.stringify(errs));
} finally {
  dev.kill();
}
