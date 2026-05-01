---
title: RAG
type: concept
area: [research]
tags: [llm-agents, retrieval, information-architecture]
created: 2026-04-18
updated: 2026-04-18
source_count: 1
aliases: [Retrieval-Augmented Generation, 검색 증강 생성]
---

# RAG (Retrieval-Augmented Generation)

A standard pattern for using LLMs with document collections. At query time, relevant chunks are retrieved from an index (typically via vector embeddings) and inserted into the LLM's context to ground its answer.

## Characteristics

- **Stateless between queries** — no knowledge accumulates across interactions.
- **Rediscovered each time** — the LLM reconstructs a synthesis from scratch for every question.
- **Index-only artifact** — there is no persistent synthesized layer between query and raw sources.

## Products Built on RAG

- [[NotebookLM]] — Google's notebook / RAG product.
- ChatGPT file uploads.
- Most enterprise RAG systems.

## Limitations (from the [[LLM Wiki Pattern]] perspective)

- No compounding: asking 100 questions yields nothing durable across them.
- Cross-document synthesis is re-performed every query.
- Contradictions across sources go undetected unless explicitly asked about.

## Sources

- [[2026-04-18-llm-wiki-pattern]]
