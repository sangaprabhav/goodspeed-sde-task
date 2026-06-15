# AI Provider Configuration

## Provider Abstraction

The application has two independent provider ports:

```typescript
interface ChatProvider {
  readonly id: string;
  complete(request: ChatRequest): AsyncIterable<ChatToken>;
  completeSync?(request: ChatRequest): Promise<ChatCompletion>;
}

interface EmbeddingProvider {
  readonly id: string;
  readonly model: string;
  readonly dimensions: number;
  embed(texts: string[]): Promise<EmbeddingResult[]>;
}
```

The backend receives an `AIRegistry` containing one implementation of each port.

Application services do not import the OpenAI SDK or construct provider-specific payloads.

## Supported Adapter Families

### OpenAI-compatible

Used for providers exposing OpenAI-compatible chat-completion and embedding endpoints.

Examples:

- OpenAI
- OpenRouter
- Together AI
- Groq for chat
- Other compatible gateways

### Ollama

Uses Ollama's native local endpoints:

- `/api/chat`
- `/api/embeddings`

## Independent Provider Selection

Chat and embedding settings are separate:

```env
AI_CHAT_PROVIDER=
AI_CHAT_BASE_URL=
AI_CHAT_API_KEY=
AI_CHAT_MODEL=

AI_EMBEDDING_PROVIDER=
AI_EMBEDDING_BASE_URL=
AI_EMBEDDING_API_KEY=
AI_EMBEDDING_MODEL=
AI_EMBEDDING_DIMENSIONS=
```

This enables configurations such as:

- Groq chat plus OpenAI embeddings
- Ollama chat plus OpenRouter embeddings
- OpenRouter chat plus OpenAI embeddings

## OpenRouter

```env
OPENROUTER_API_KEY=sk-or-...

AI_CHAT_PROVIDER=openai-compatible
AI_CHAT_BASE_URL=https://openrouter.ai/api/v1
AI_CHAT_API_KEY=
AI_CHAT_MODEL=openai/gpt-4o-mini

AI_EMBEDDING_PROVIDER=openai-compatible
AI_EMBEDDING_BASE_URL=https://openrouter.ai/api/v1
AI_EMBEDDING_API_KEY=
AI_EMBEDDING_MODEL=openai/text-embedding-3-small
AI_EMBEDDING_DIMENSIONS=1536

DB_VECTOR_DIMENSIONS=1536
```

When provider-specific key variables are blank, `OPENROUTER_API_KEY` is used as a fallback.

The settings screen exposes a curated list of OpenRouter model identifiers.

## OpenAI

```env
OPENROUTER_API_KEY=

AI_CHAT_PROVIDER=openai-compatible
AI_CHAT_BASE_URL=https://api.openai.com/v1
AI_CHAT_API_KEY=sk-...
AI_CHAT_MODEL=gpt-4o-mini

AI_EMBEDDING_PROVIDER=openai-compatible
AI_EMBEDDING_BASE_URL=https://api.openai.com/v1
AI_EMBEDDING_API_KEY=sk-...
AI_EMBEDDING_MODEL=text-embedding-3-small
AI_EMBEDDING_DIMENSIONS=1536

DB_VECTOR_DIMENSIONS=1536
```

For non-OpenRouter endpoints, environment model identifiers are authoritative. The UI does not replace them with OpenRouter-specific values.

## Groq Chat With OpenAI Embeddings

```env
OPENROUTER_API_KEY=

AI_CHAT_PROVIDER=openai-compatible
AI_CHAT_BASE_URL=https://api.groq.com/openai/v1
AI_CHAT_API_KEY=gsk_...
AI_CHAT_MODEL=YOUR_GROQ_CHAT_MODEL

AI_EMBEDDING_PROVIDER=openai-compatible
AI_EMBEDDING_BASE_URL=https://api.openai.com/v1
AI_EMBEDDING_API_KEY=sk-...
AI_EMBEDDING_MODEL=text-embedding-3-small
AI_EMBEDDING_DIMENSIONS=1536

DB_VECTOR_DIMENSIONS=1536
```

Groq is shown as chat-only here because embedding support should not be assumed merely from chat API compatibility.

## Together AI

Use Together's current OpenAI-compatible endpoint and model identifiers:

```env
AI_CHAT_PROVIDER=openai-compatible
AI_CHAT_BASE_URL=YOUR_TOGETHER_OPENAI_COMPATIBLE_BASE_URL
AI_CHAT_API_KEY=...
AI_CHAT_MODEL=YOUR_TOGETHER_CHAT_MODEL

AI_EMBEDDING_PROVIDER=openai-compatible
AI_EMBEDDING_BASE_URL=YOUR_TOGETHER_OPENAI_COMPATIBLE_BASE_URL
AI_EMBEDDING_API_KEY=...
AI_EMBEDDING_MODEL=YOUR_1536_DIMENSION_EMBEDDING_MODEL
AI_EMBEDDING_DIMENSIONS=1536
```

Provider model availability and identifiers can change, so they are intentionally configuration values rather than hard-coded application logic.

## Ollama Chat With Hosted Embeddings

```env
AI_CHAT_PROVIDER=ollama
AI_CHAT_BASE_URL=http://localhost:11434
AI_CHAT_API_KEY=
AI_CHAT_MODEL=llama3.2

AI_EMBEDDING_PROVIDER=openai-compatible
AI_EMBEDDING_BASE_URL=https://api.openai.com/v1
AI_EMBEDDING_API_KEY=sk-...
AI_EMBEDDING_MODEL=text-embedding-3-small
AI_EMBEDDING_DIMENSIONS=1536

DB_VECTOR_DIMENSIONS=1536
```

Ollama embeddings can also be used when the chosen local model returns exactly 1536 dimensions.

## Vector-Dimension Constraint

Provider independence does not remove database constraints.

The schema stores:

```sql
vector(1536)
```

The registry rejects configurations where:

```text
AI_EMBEDDING_DIMENSIONS != DB_VECTOR_DIMENSIONS
```

This catches invalid configurations before ingestion begins.

Changing to 768, 1024, or 3072 dimensions requires:

1. A schema migration for the vector column and search function.
2. Rebuilding the HNSW index.
3. Reindexing every document.

## Changing Embedding Models

Even if two models both return 1536 values, their vector spaces are not interchangeable.

After changing the embedding model:

1. Save the configuration.
2. Open Documents.
3. Run **Re-index**.
4. Wait for all documents to complete.

Retrieval filters by embedding model and dimensions, preventing stale chunks from silently entering results.

## Adding a New Provider

For an OpenAI-compatible provider:

1. Set its base URL, key, and model.
2. No code change is required.

For a provider with a different protocol:

1. Implement `ChatProvider`, `EmbeddingProvider`, or both.
2. Add the provider kind to configuration types.
3. Register the adapter in `registry.ts`.
4. Add unit tests for resolution, errors, streaming, and dimensions.

No RAG or conversation service changes should be necessary.

## Provider Compatibility Checklist

- [ ] Chat endpoint accepts normalized role/content messages
- [ ] Streaming response can be converted to content tokens
- [ ] Embedding endpoint accepts batches or is adapted internally
- [ ] Embedding vectors contain exactly 1536 numbers
- [ ] Model identifier is valid for the selected endpoint
- [ ] API key is available only on the server
- [ ] Usage reporting behavior is understood
- [ ] Reindex completed after embedding-model changes
