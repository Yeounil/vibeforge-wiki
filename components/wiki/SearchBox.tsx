"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { Route } from "next";

interface SearchHit {
  slug: string;
  title: string;
  score: number;
}

export function SearchBox() {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setHits([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          signal: ctrl.signal,
        });
        const data = (await res.json()) as { hits: SearchHit[] };
        setHits(data.hits);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error(err);
        }
      } finally {
        setLoading(false);
      }
    }, 150);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query]);

  return (
    <div className="my-4">
      <input
        type="search"
        placeholder="위키 검색…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="border rounded px-2 py-1 w-full"
        aria-label="Search wiki"
      />
      {loading && <p className="text-xs text-gray-400 mt-1">검색 중…</p>}
      {hits.length > 0 && (
        <ul className="mt-2 border rounded divide-y">
          {hits.map((h) => (
            <li key={h.slug} className="p-2">
              <Link href={`/wiki/${h.slug}` as Route} className="underline">
                {h.title}
              </Link>
              <span className="text-xs text-gray-500 ml-2">{h.slug}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
