import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { loadSearchIndex, searchPages } from "@/lib/wiki/search-index";

let cachedIndex: Awaited<ReturnType<typeof loadSearchIndex>> | null = null;

async function getIndex() {
  if (cachedIndex) return cachedIndex;
  const file = path.resolve(process.cwd(), "public", "wiki-data", "search.json");
  const json = await readFile(file, "utf-8");
  cachedIndex = loadSearchIndex(json);
  return cachedIndex;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  if (!q) {
    return NextResponse.json({ hits: [] });
  }
  const idx = await getIndex();
  const hits = searchPages(idx, q).slice(0, 20);
  return NextResponse.json({ hits });
}
