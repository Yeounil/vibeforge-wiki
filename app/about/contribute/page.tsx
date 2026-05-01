import path from "node:path";
import fs from "node:fs/promises";
import { notFound } from "next/navigation";
import { renderBody } from "@/lib/wiki/render";
import { getAliasMap } from "@/lib/wiki/page-loader";
import { SiteHeader } from "@/components/layout/SiteHeader";

export const metadata = {
  title: "Contribute — VibeForge",
};

export const revalidate = 3600;

const CONTRIBUTING_PATH = path.resolve(process.cwd(), "content", "CONTRIBUTING.md");

export default async function ContributePage() {
  let html: string;
  try {
    const body = await fs.readFile(CONTRIBUTING_PATH, "utf-8");
    const aliasMap = await getAliasMap();
    html = await renderBody(body, aliasMap);
  } catch (e) {
    console.error("[contribute page load failed]", e);
    notFound();
  }

  return (
    <div className="min-h-screen p-4 md:p-6 bg-[var(--bg-gradient)]">
      <SiteHeader />
      <main className="max-w-3xl mx-auto mt-6">
        <article
          className="vf-card p-6 md:p-8 prose max-w-none"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </main>
    </div>
  );
}
