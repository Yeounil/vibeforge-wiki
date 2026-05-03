import { notFound } from "next/navigation";
import { loadSitePage } from "@/lib/site-pages/loader";
import { renderBody } from "@/lib/wiki/render";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Pill } from "@/components/ui";
import type { Route } from "next";

export const metadata = {
  title: "About — VibeForge",
};

export default async function AboutPage() {
  let html: string;
  try {
    const page = await loadSitePage("about");
    html = await renderBody(page.body, new Map());
  } catch (e) {
    console.error("[about page load failed]", e);
    notFound();
  }

  return (
    <div className="min-h-screen p-4 md:p-6 bg-[var(--bg-gradient)]">
      <SiteHeader />
      <main className="max-w-3xl mx-auto mt-6">
        <article
          className="bg-[var(--canvas)] border border-[var(--hairline)] rounded-[var(--r-md)] p-6 md:p-8 prose max-w-none"
          dangerouslySetInnerHTML={{ __html: html }}
        />
        <div className="mt-6 flex flex-wrap gap-3">
          <Pill href={"/wiki" as Route} variant="secondary">위키 둘러보기</Pill>
          <Pill href={"/forum" as Route} variant="secondary">포럼 보기</Pill>
        </div>
      </main>
    </div>
  );
}
