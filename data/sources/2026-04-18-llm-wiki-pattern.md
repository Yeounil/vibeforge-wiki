---
title: LLM Wiki Pattern (Source Doc)
type: source
area: [personal, research]
tags: [knowledge-management, llm-agents, second-brain, wiki]
created: 2026-04-18
updated: 2026-04-18
source_type: article
source_path: raw/misc/llm-wiki-manifesto.md
authors: unknown
aliases: [LLM Wiki Manifesto]
---

# LLM Wiki Pattern — Source Summary

The founding document for this vault. Proposes a pattern in which an LLM agent incrementally builds and maintains a persistent markdown wiki layer over raw sources, rather than re-retrieving from sources on every query as [[RAG]] does. Meta-source: this document bootstraps the very vault it describes.

## Key Points

1. **Compounding vs. re-derivation.** RAG retrieves chunks per query; the LLM wiki pattern compiles knowledge once into a structured artifact that keeps getting richer with each source.
2. **Three layers.** Raw sources (immutable), wiki (LLM-owned markdown), schema (config doc — e.g. CLAUDE.md — that makes the LLM a disciplined maintainer).
3. **Division of labor.** Human curates sources, asks questions, directs analysis. LLM does reading, summarizing, cross-referencing, filing, bookkeeping — the maintenance burden that kills human-maintained wikis.
4. **Four operations.** Ingest (add source → touch 10–15 pages), Query (answer from wiki, optionally file the answer back), Lint (periodic health check for contradictions, orphans, gaps), Maintain (continuous consistency).
5. **[[Obsidian]] as the IDE.** LLM on one side, Obsidian on the other — user browses graph, follows links, reads updates in real time.
6. **Index + log as lightweight RAG alternative.** An `index.md` catalog and chronological `log.md` scale to hundreds of pages without embedding infrastructure. Search engines like [[qmd]] can be layered on later.
7. **[[Memex]] lineage.** The pattern echoes [[Vannevar Bush]]'s 1945 Memex vision — personal, curated, associatively-linked knowledge — and answers Bush's unsolved "who does the maintenance" question with the LLM.

## Applications Mentioned

- Personal knowledge / self-improvement (journal entries, articles, podcast notes)
- Topic research over weeks or months (papers, reports, evolving thesis)
- Book / course companion wikis — e.g. [[Tolkien Gateway]]-style but personal
- Team / business wikis fed by Slack threads, meeting transcripts, docs
- Competitive analysis, due diligence, trip planning, hobby deep-dives

## Tooling Mentioned

- [[Obsidian]] — wiki browsing, graph view, Dataview, Marp plugin
- Obsidian Web Clipper — quick web-article capture as markdown
- [[qmd]] — local BM25 + vector search with LLM re-ranking (CLI + MCP)
- [[NotebookLM]] — contrast: classic RAG approach

## Operational Guidance Extracted

- Ingest one at a time, stay in the loop, review summaries as the LLM writes them
- Good answers should be filed back as `notes/` pages so explorations compound
- Download images locally (Obsidian Attachment folder + hotkey) so LLM can reference them
- Store the vault as a git repo for free version history

## Related Concepts

- [[LLM Wiki Pattern]] — the pattern itself, extracted as its own concept page
- [[Memex]] — Vannevar Bush, 1945
- [[RAG]] — contrast baseline

## Notes

This is a meta-source: the document that bootstraps this vault. It is intentionally abstract — it describes the pattern, not an implementation. The concrete instantiation (folder layout, schema, conventions) was decided collaboratively with the user on 2026-04-18 and lives in `CLAUDE.md`.
