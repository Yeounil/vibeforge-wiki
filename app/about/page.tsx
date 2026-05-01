import { notFound } from "next/navigation";
import { loadSitePage } from "@/lib/site-pages/loader";
import { renderBody } from "@/lib/wiki/render";
import { SiteHeader } from "@/components/layout/SiteHeader";

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
          className="vf-card p-6 md:p-8 prose max-w-none"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </main>
    </div>
  );
}
