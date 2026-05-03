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
  // post 4 (인덱스가 뭐예요?) — has 3 cross-refs
  await page.goto(
    `http://localhost:${port}/forum/post/34cdc77a-ec86-4512-8cf0-1a2217340e8a`,
    { waitUntil: "domcontentloaded" }
  );
  await page.waitForTimeout(2500);

  const probe = await page.evaluate(() => {
    const article = document.querySelector("article");
    if (!article) return { error: "no article" };
    const links = Array.from(article.querySelectorAll("a")).map((a) => ({
      href: a.getAttribute("href"),
      text: a.textContent?.trim().slice(0, 60),
    }));
    const h2s = Array.from(article.querySelectorAll("h2")).map((h) =>
      h.textContent?.trim().slice(0, 60)
    );
    const codeBlocks = article.querySelectorAll("pre code").length;
    return {
      anchorCount: links.length,
      links,
      h2s,
      codeBlocks,
      bodyHtmlSample: article.innerHTML.slice(0, 600),
    };
  });
  console.log("===== PROBE =====");
  console.log(JSON.stringify(probe, null, 2));

  await page.screenshot({ path: "scripts/_forum-render.png" });
} finally {
  dev.kill();
}
