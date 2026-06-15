# RAG Pipeline

## Goals

The retrieval pipeline is designed to:

- Preserve enough context to answer document questions
- Avoid losing facts at chunk boundaries
- Keep prompts reasonably small
- Provide traceable citations
- Prevent failed reindexing from removing a valid corpus
- Support configurable AI providers

## Chunking

Default values:

```env
RAG_CHUNK_SIZE=800
RAG_CHUNK_OVERLAP=120
```

The chunker works in characters and prefers the latest viable boundary in this order:

1. Blank line
2. Newline
3. Sentence ending represented by `. `
4. Space

If no natural boundary appears after half the target chunk size, it uses the hard target boundary.

Each chunk stores:

- Trimmed text
- Start character offset
- End character offset
- Sequential chunk index

Offsets allow citations to highlight the original passage even though whitespace is trimmed.

## Why 800 Characters

Eight hundred characters is approximately 150-250 English tokens depending on content. It provides enough local context for common notes and technical documents without making each retrieval result excessively broad.

The 120-character overlap is roughly 15 percent and reduces boundary loss.

The values are deliberately configurable because optimal chunking depends on corpus style and evaluation results.

## Embedding

Chunks are embedded in batches of 20.

The `EmbeddingProvider` returns:

- Original text
- Vector
- Position in the request

The adapter verifies every returned vector has the configured dimension.

## Embedding-Space Rules

The current database column is:

```sql
embedding vector(1536)
```

Therefore:

- `AI_EMBEDDING_DIMENSIONS` must be 1536.
- `DB_VECTOR_DIMENSIONS` must be 1536.
- The selected model must actually return 1536 values.
- A different dimension requires a database migration and complete reindex.

Even when dimensions match, vectors from different models should not be mixed for retrieval. Chunk rows include model and provider metadata, and retrieval filters by the active model and dimensions.

## Atomic Ingestion

Every ingestion receives a UUID.

```text
existing active version: A
new staged version:      B
```

Chunks for B are written while A remains active. Once B is complete:

```text
documents.active_ingestion_id = B
delete chunks where ingestion_id != B
```

If B fails:

```text
delete staged B chunks
leave A active
```

This avoids an empty or partially indexed document.

## Retrieval

Default settings:

```env
RAG_TOP_K=5
RAG_SIMILARITY_THRESHOLD=0.2
```

Before semantic retrieval, the API checks whether the message is a document inventory request, for example:

- "What documents do I have?"
- "List my files"
- "How many documents do I have?"

These questions are answered from the user-scoped `documents` table. The response lists every document deterministically and does not generate embeddings, citations, or provider token usage.

Questions about document content continue through vector retrieval. For example, "Which documents mention NestJS?" is not treated as a simple inventory request.

The API:

1. Embeds the question.
2. Requests the nearest `RAG_TOP_K` active chunks.
3. Filters chunks below the threshold.
4. Maps remaining chunks to citations.

Each citation includes:

- Document ID
- Chunk ID
- Document title
- Excerpt
- Similarity score
- Chunk index

## Prompt Construction

When context exists, the system prompt tells the model:

- Use only supplied knowledge-base context
- State clearly when the answer is absent
- Do not invent information
- Produce concise, readable Markdown

Context blocks identify their source document and ordinal position.

When no chunks pass retrieval, the prompt asks the assistant to explain that no indexed or relevant document context is available.

## Conversation History

The most recent 20 stored messages are included before the current user message.

This supports multi-turn follow-ups while placing a simple bound on prompt growth.

## Streaming

The chat provider yields normalized token events. The API converts these to SSE:

- `citation`
- `token`
- `done`
- `error`

The frontend renders the outgoing user message immediately and appends assistant tokens as they arrive.

Metadata answers use the same SSE and persistence contract, even though no external model is called.

## Evaluation Plan

A production-quality evaluation harness should contain:

- Representative documents
- Questions with known source passages
- Unanswerable questions
- Expected citations
- Expected answer facts

Suggested metrics:

- Recall@k
- Precision@k
- Mean reciprocal rank
- Citation accuracy
- Groundedness
- Answer completeness
- Refusal correctness for absent answers
- Latency and token cost

The threshold, chunk size, overlap, and top-k should be tuned against these results rather than intuition alone.
