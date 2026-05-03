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

  await page.addInitScript(() => {
    // Reach into @react-sigma's SigmaContainer to expose the sigma instance.
    // Easiest path: walk the DOM after mount — sigma stores its instance on the
    // container element via a non-public property. We instead patch React Sigma's
    // setSetting/refresh to capture the instance.
    const orig = window.HTMLCanvasElement;
    // Plan B: poll for sigma via the global graph from graphology (it caches in window?)
  });

  await page.goto(`http://localhost:${port}/wiki/graph`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('[data-testid="graph-canvas"] canvas', { timeout: 15000 });
  await page.waitForTimeout(8000); // well past forceatlas2 cooldown

  // Probe canvas pixels — find non-white pixel bbox in the largest sigma canvas.
  const probe = await page.evaluate(() => {
    const canvases = Array.from(
      document.querySelectorAll('[data-testid="graph-canvas"] canvas')
    );
    if (canvases.length === 0) return { error: "no canvas" };

    const results = [];
    for (let i = 0; i < canvases.length; i++) {
      const c = canvases[i];
      const ctx2d = c.getContext("2d", { willReadFrequently: true });
      if (!ctx2d) {
        // WebGL canvas — can't read 2d pixels directly. Read via toDataURL → image
        results.push({ idx: i, type: "webgl", w: c.width, h: c.height });
        continue;
      }
      const w = c.width, h = c.height;
      const img = ctx2d.getImageData(0, 0, w, h).data;
      let minX = w, minY = h, maxX = -1, maxY = -1, painted = 0;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i4 = (y * w + x) * 4;
          const a = img[i4 + 3];
          if (a > 0) {
            painted++;
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
          }
        }
      }
      results.push({
        idx: i,
        type: "2d",
        w, h,
        painted,
        bbox: maxX < 0 ? null : { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY },
      });
    }

    // Also try WebGL readPixels
    for (let i = 0; i < canvases.length; i++) {
      const c = canvases[i];
      const gl = c.getContext("webgl2") || c.getContext("webgl");
      if (!gl) continue;
      const w = c.width, h = c.height;
      const buf = new Uint8Array(w * h * 4);
      try {
        gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buf);
      } catch (e) {
        results.push({ idx: i, type: "webgl-readpixels-failed", err: String(e) });
        continue;
      }
      let minX = w, minY = h, maxX = -1, maxY = -1, painted = 0;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i4 = (y * w + x) * 4;
          const a = buf[i4 + 3];
          if (a > 0) {
            painted++;
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
          }
        }
      }
      results.push({
        idx: i,
        type: "webgl-pixels",
        w, h, painted,
        bbox: maxX < 0 ? null : { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY },
      });
    }
    return { results };
  });

  console.log("===== PIXEL PROBE =====");
  console.log(JSON.stringify(probe, null, 2));

  await page.screenshot({ path: "scripts/_diag-coords.png" });

  // Now zoom in by extracting the canvas region from the screenshot for visual inspection
  await page.screenshot({
    path: "scripts/_diag-coords-zoom.png",
    clip: { x: 24, y: 140, width: 1392, height: 200 },
  });
} finally {
  dev.kill();
}
