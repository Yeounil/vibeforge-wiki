---
title: LLM Wiki Pattern
type: concept
area: [personal, research]
tags: [knowledge-management, llm-agents, second-brain, wiki]
created: 2026-04-18
updated: 2026-04-18
source_count: 1
aliases: [LLM-maintained wiki, compounding wiki, LLM 위키 패턴]
---

# LLM Wiki Pattern

A pattern for personal knowledge bases in which an LLM agent incrementally builds and maintains a persistent markdown wiki layer over raw sources — as opposed to retrieving from raw sources at every query, which is how [[RAG]] works.

## Core Distinction from RAG

| | [[RAG]] | LLM Wiki Pattern |
|---|---|---|
| Knowledge | Re-derived per query | Compiled once, kept current |
| Artifact | Index of chunks only | Index + persistent wiki |
| Maintenance | None (stateless) | LLM does the bookkeeping |
| Cross-references | Implicit (nearest neighbors) | Explicit (<code>&#91;&#91;wikilinks&#93;&#93;</code>) |
| Synthesis | On-demand, ephemeral | Accumulated, durable |

## Three Layers

1. **Raw sources** — immutable user-curated documents.
2. **Wiki** — LLM-owned markdown (summaries, entity pages, concept pages, indexes, logs).
3. **Schema** — config doc (e.g. CLAUDE.md) that makes the LLM a disciplined wiki maintainer rather than a generic chatbot.

## Four Operations

- **Ingest** — user drops a source, agent reads and files it, touching ~10–15 wiki pages.
- **Query** — user asks a question; agent answers from the wiki and optionally files the answer back.
- **Lint** — periodic health check for contradictions, stale claims, orphans, and gaps.
- **Maintain** — continuous cross-reference and consistency upkeep during normal operation.

## Why It Works

Human-maintained wikis die from maintenance burden — updating cross-references, keeping summaries current, flagging contradictions across dozens of pages grows faster than the value. LLMs don't get bored, don't forget cross-references, and can touch 15 files in one pass. Maintenance cost approaches zero, so the artifact stays alive.

## Intellectual Lineage

- [[Memex]] ([[Vannevar Bush]], 1945) — private, curated, associatively-linked knowledge. Bush couldn't answer "who maintains it." The LLM answers it.

## This Vault

This vault is itself an instance of the pattern. The schema lives in `CLAUDE.md`; the bootstrap source is [[2026-04-18-llm-wiki-pattern]].

## Sources

- [[2026-04-18-llm-wiki-pattern]]
