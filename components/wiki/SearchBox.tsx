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
    <div className="relative">
      <input
        type="search"
        placeholder="위키 검색…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full bg-white/70 backdrop-blur rounded-full px-4 py-2 text-sm border border-black/5 focus:outline-none focus:ring-2 focus:ring-[var(--accent-from)]/30"
        aria-label="Search wiki"
      />
      {loading && (
        <p className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-secondary)]">
          검색 중…
        </p>
      )}
      {hits.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full vf-card divide-y divide-black/5 max-h-80 overflow-auto">
          {hits.map((h) => (
            <li key={h.slug} className="p-3 hover:bg-black/5">
              <Link
                href={`/wiki/${h.slug}` as Route}
                className="text-[var(--text-primary)] font-medium"
              >
                {h.title}
              </Link>
              <span className="text-xs text-[var(--text-secondary)] ml-2">{h.slug}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
