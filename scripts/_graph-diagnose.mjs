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

const events = [];
const consoleAll = [];

try {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => events.push({ type: "pageerror", msg: e.message, stack: e.stack?.split("\n").slice(0, 8).join("\n") }));
  page.on("console", (m) => consoleAll.push({ type: m.type(), text: m.text() }));
  page.on("requestfailed", (req) => events.push({ type: "requestfailed", url: req.url(), failure: req.failure()?.errorText }));

  await page.goto(`http://localhost:${port}/wiki/graph`, { waitUntil: "domcontentloaded" });

  // Snapshot at t=1s
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "scripts/_diag-1s.png" });
  let domState1 = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="graph-canvas"]');
    const root = document.querySelector("body");
    return {
      bodyChildCount: root ? root.children.length : 0,
      bodyText: (root?.innerText || "").slice(0, 200),
      hasGraphCanvas: !!el,
      graphCanvasRect: el ? el.getBoundingClientRect() : null,
      graphCanvasChildren: el ? el.children.length : 0,
      sigmaCanvasCount: document.querySelectorAll('[data-testid="graph-canvas"] canvas').length,
    };
  });

  // Snapshot at t=4s (after layout cooldown should start)
  await page.waitForTimeout(3000);
  await page.screenshot({ path: "scripts/_diag-4s.png" });
  let domState4 = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="graph-canvas"]');
    return {
      hasGraphCanvas: !!el,
      graphCanvasRect: el ? el.getBoundingClientRect() : null,
      graphCanvasChildren: el ? el.children.length : 0,
      sigmaCanvasCount: document.querySelectorAll('[data-testid="graph-canvas"] canvas').length,
      hoverHandlersAttached: !!document.querySelector('[data-testid="graph-canvas"] .sigma-mouse'),
    };
  });

  // Snapshot at t=10s (well after cooldown + camera fit)
  await page.waitForTimeout(6000);
  await page.screenshot({ path: "scripts/_diag-10s.png" });
  let domState10 = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="graph-canvas"]');
    return {
      hasGraphCanvas: !!el,
      graphCanvasRect: el ? el.getBoundingClientRect() : null,
      sigmaCanvasCount: document.querySelectorAll('[data-testid="graph-canvas"] canvas').length,
    };
  });

  console.log("\n===== DIAGNOSE =====");
  console.log("PORT:", port);
  console.log("EVENTS:", JSON.stringify(events, null, 2));
  console.log("CONSOLE (filtered to non-info):");
  for (const c of consoleAll) {
    if (c.type === "log" && c.text.startsWith("[Fast Refresh]")) continue;
    console.log(" ", c.type, "::", c.text.slice(0, 300));
  }
  console.log("DOM @ 1s:", JSON.stringify(domState1, null, 2));
  console.log("DOM @ 4s:", JSON.stringify(domState4, null, 2));
  console.log("DOM @ 10s:", JSON.stringify(domState10, null, 2));
} finally {
  dev.kill();
}
