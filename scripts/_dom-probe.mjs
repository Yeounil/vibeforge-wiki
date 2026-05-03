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
  await page.goto(`http://localhost:${port}/wiki/graph`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('[data-testid="graph-canvas"] canvas', { timeout: 15000 });
  await page.waitForTimeout(2500);

  const probe = await page.evaluate(() => {
    const out = [];
    const target = document.querySelector('[data-testid="graph-canvas"]');
    if (!target) return { error: "no graph-canvas wrapper" };

    // Walk descendants to find sigma-related divs and canvases
    function describe(el) {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        tag: el.tagName,
        id: el.id || null,
        className: el.className?.toString?.() || el.className || null,
        rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
        styleHeight: el.style.height || null,
        styleWidth: el.style.width || null,
        cssDisplay: cs.display,
        cssPosition: cs.position,
        cssHeight: cs.height,
        cssMinHeight: cs.minHeight,
        cssWidth: cs.width,
        clientH: el.clientHeight,
        offsetH: el.offsetHeight,
        canvasAttrW: el.tagName === "CANVAS" ? el.width : null,
        canvasAttrH: el.tagName === "CANVAS" ? el.height : null,
      };
    }

    // graph-canvas wrapper
    out.push({ role: "wrapper", ...describe(target) });

    // Walk the entire subtree
    const walk = (el, depth) => {
      for (const c of Array.from(el.children)) {
        out.push({ role: `descendant-d${depth}`, ...describe(c) });
        walk(c, depth + 1);
      }
    };
    walk(target, 1);

    // Also walk ancestors up 3 levels
    let p = target.parentElement;
    let depth = 1;
    while (p && depth <= 4) {
      out.unshift({ role: `ancestor-up${depth}`, ...describe(p) });
      p = p.parentElement;
      depth++;
    }

    return out;
  });

  console.log("===== DOM PROBE =====");
  console.log(JSON.stringify(probe, null, 2));
} finally {
  dev.kill();
}
