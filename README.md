# Goodspeed AI-Powered Knowledge Base

A full-stack retrieval-augmented generation application where authenticated users can create documents, index them with vector embeddings, and ask grounded questions through a streaming AI chat interface.

This repository is my submission for the Goodspeed Software Developer Technical Assessment.

## Walkthroughs

> Replace both placeholders before submitting the repository.

- **Application walkthrough:** [Add Loom URL](#)
- **How I used AI to accelerate development:** [Add Loom URL](#)

## What Is Included

### Core requirements

- Turborepo monorepo with Next.js, NestJS, and shared packages
- Supabase email/password authentication
- User-isolated document CRUD
- PostgreSQL Row Level Security policies
- Document chunking and embedding generation
- pgvector similarity search with an HNSW index
- Retrieval-augmented chat prompts
- Streaming responses using Server-Sent Events
- Persistent conversations and messages
- Provider-agnostic chat and embedding interfaces

### Additional features

- Source citations with similarity scores
- Exact cited-passage highlighting using source offsets
- TXT and text-based PDF uploads
- Per-user model settings
- Corpus reindexing
- Token usage summaries
- Responsive desktop and mobile UI
- Atomic, versioned document ingestion
- Structured API errors and request rate limiting
- Automated tests and GitHub Actions CI
- Authenticated mobile Playwright coverage

## Technology

| Layer | Technology |
| --- | --- |
| Monorepo | Turborepo and pnpm workspaces |
| Frontend | Next.js 15, React 19, Tailwind CSS, TanStack Query |
| Backend | NestJS 10 |
| Authentication | Supabase Auth |
| Database | Supabase PostgreSQL |
| Vector search | pgvector with cosine distance and HNSW |
| AI clients | OpenAI SDK plus native Ollama adapters |
| Validation | Zod |
| Testing | Vitest and Playwright |
| CI | GitHub Actions |

## Repository Structure

```text
.
|-- apps
|   |-- api                 # NestJS API, RAG orchestration, ingestion
|   `-- web                 # Next.js application
|-- packages
|   |-- ai                  # Provider ports, adapters, registry, errors
|   |-- config              # Shared TypeScript configurations
|   `-- shared              # Schemas, domain types, constants, utilities
|-- supabase
|   `-- migrations          # Schema, pgvector RPCs, RLS, ingestion versioning
|-- docs                    # Detailed technical and operational documentation
|-- scripts
|   `-- setup.mjs           # Local environment setup helper
`-- .github/workflows       # Continuous integration
```

## Quick Start

### Prerequisites

- Node.js 22 or later
- pnpm 9.15 or later
- A Supabase project
- An OpenAI-compatible AI provider key, or a reachable Ollama instance

### 1. Install and prepare the environment

```bash
pnpm run setup
```

This installs workspace dependencies, installs Chromium for the end-to-end test suite, and creates `.env` from `.env.example` when `.env` does not already exist.

Use `pnpm run setup`, not `pnpm setup`. The latter is pnpm's built-in shell configuration command and does not install this project's dependencies.

### 2. Configure environment variables

At minimum, populate:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

OPENROUTER_API_KEY=
```

The default configuration uses OpenRouter for both chat and embeddings. See [AI providers](docs/AI_PROVIDERS.md) for OpenAI, Groq, Together AI, OpenRouter, and Ollama examples.

### 3. Apply database migrations

In the Supabase SQL editor, execute every file in numeric order:

```text
supabase/migrations/001_init.sql
supabase/migrations/002_user_ai_settings.sql
supabase/migrations/003_chunk_offsets.sql
supabase/migrations/004_atomic_ingestion.sql
```

For a new database, all four files should still be applied. Later migrations are idempotent and preserve compatibility with databases created from earlier versions of this project.

### 4. Configure Supabase Auth

Email/password authentication is sufficient. For the smoothest local evaluation:

1. Open **Authentication > Providers > Email** in Supabase.
2. Enable the email provider.
3. Either disable email confirmation for local testing or confirm the test account before signing in.
4. Add `http://localhost:3000` as an allowed local redirect URL if required by the project settings.

### 5. Start the application

```bash
pnpm dev
```

- Web application: [http://localhost:3000](http://localhost:3000)
- API health endpoint: [http://localhost:3001/api/v1/health](http://localhost:3001/api/v1/health)

### 6. Verify the repository

```bash
pnpm check
```

This runs linting, TypeScript checks, unit tests, both production builds, and the Playwright end-to-end test.

## Useful Commands

| Command | Purpose |
| --- | --- |
| `pnpm run setup` | Install dependencies and create `.env` |
| `pnpm dev` | Run the web and API development servers |
| `pnpm lint` | Run ESLint across workspaces |
| `pnpm typecheck` | Run TypeScript checks |
| `pnpm test` | Run the Vitest suites |
| `pnpm test:e2e` | Run the Playwright mobile user journey |
| `pnpm build` | Produce production builds |
| `pnpm check` | Run the complete local quality gate |

## Application Flow

### Document ingestion

1. A user creates, edits, or uploads a document.
2. The NestJS API validates the request and relies on the user's Supabase JWT.
3. The chunker splits content at natural text boundaries with configurable overlap.
4. Character offsets are retained for citation highlighting.
5. The configured embedding provider creates vectors in batches.
6. New chunks are staged under a fresh `ingestion_id`.
7. A PostgreSQL function atomically activates the completed ingestion.
8. Previous chunk versions are removed only after activation succeeds.

This versioned approach prevents an embedding outage or failed insert from destroying an existing valid index.

### Question answering

1. The user sends a message to a conversation.
2. Inventory questions such as "What documents do I have?" are routed to an exact document metadata query.
3. Content questions are embedded through the configured embedding provider.
4. PostgreSQL retrieves the nearest active chunks using cosine similarity.
5. Results below `RAG_SIMILARITY_THRESHOLD` are discarded.
6. Retrieved text is inserted into a grounding prompt.
7. The chat provider streams the answer through SSE.
8. The assistant message, citations, and usage data are persisted.

The metadata route prevents vector search from returning only the documents whose content happens to be semantically close to words such as "documents" or "files."

## Architecture Decisions

### Separate NestJS API

The backend is intentionally separate from Next.js route handlers. Authentication verification, ingestion, retrieval, AI orchestration, usage recording, and provider selection are server responsibilities with clear NestJS module boundaries.

### Database-enforced tenant isolation

Every user-owned table includes `user_id` and has RLS enabled. The API forwards the caller's access token to Supabase rather than using the service role for application CRUD. API filters provide defense in depth, but PostgreSQL remains the authorization boundary.

### Domain-owned AI interfaces

`packages/ai` defines provider-neutral ports:

```typescript
interface ChatProvider {
  readonly id: string;
  complete(request: ChatRequest): AsyncIterable<ChatToken>;
}

interface EmbeddingProvider {
  readonly id: string;
  readonly model: string;
  readonly dimensions: number;
  embed(texts: string[]): Promise<EmbeddingResult[]>;
}
```

NestJS depends on these interfaces, not on OpenAI request or response objects. Adapters translate the domain contract into provider-specific calls.

### Independent chat and embedding providers

Chat and embedding configuration are separate. For example, Groq can be used for chat while OpenAI or OpenRouter supplies embeddings.

### Explicit vector dimension

The database uses `vector(1536)`. The AI registry validates that the configured embedding output is also 1536-dimensional.

Changing providers or models within that dimension is configuration-only. Changing vector dimensions requires a database migration and complete corpus reindex because differently sized vectors cannot share the same pgvector column or HNSW index.

### Character-aware chunking

Default chunking uses:

- 800 characters per chunk
- 120 characters of overlap
- Boundary preference: paragraphs, lines, sentence endings, then spaces

Character sizing is deterministic, inexpensive, and sufficient for the document size supported by this assessment. A production system with much larger files could switch to token-aware chunking behind the same service boundary.

More detail is available in [Architecture](docs/ARCHITECTURE.md) and [RAG pipeline](docs/RAG_PIPELINE.md).

## Authentication and Security

- Supabase Auth handles email/password accounts.
- NestJS validates bearer tokens using `supabase.auth.getUser`.
- The caller's JWT is passed to all user-owned database queries.
- RLS restricts documents, chunks, conversations, messages, settings, and usage.
- Upload size and content limits are enforced.
- Chat requests are throttled.
- Rendered assistant Markdown is sanitized.
- Unexpected server exceptions return generic messages instead of internal details.
- `.env` is ignored and `.env.example` contains no real secrets.

The service-role key is used only by the public health check to verify database connectivity. It is never used for user document or conversation operations.

See [Database and security](docs/DATABASE_AND_SECURITY.md).

## Provider Configuration

The default `.env.example` uses OpenRouter:

```env
OPENROUTER_API_KEY=sk-or-...
AI_CHAT_PROVIDER=openai-compatible
AI_CHAT_BASE_URL=https://openrouter.ai/api/v1
AI_CHAT_MODEL=openai/gpt-4o-mini
AI_EMBEDDING_PROVIDER=openai-compatible
AI_EMBEDDING_BASE_URL=https://openrouter.ai/api/v1
AI_EMBEDDING_MODEL=openai/text-embedding-3-small
AI_EMBEDDING_DIMENSIONS=1536
```

An OpenAI-compatible provider is changed through:

- `AI_CHAT_PROVIDER`
- `AI_CHAT_BASE_URL`
- `AI_CHAT_API_KEY`
- `AI_CHAT_MODEL`
- `AI_EMBEDDING_PROVIDER`
- `AI_EMBEDDING_BASE_URL`
- `AI_EMBEDDING_API_KEY`
- `AI_EMBEDDING_MODEL`
- `AI_EMBEDDING_DIMENSIONS`

No application code changes are needed when the provider implements the required OpenAI-compatible endpoint and the embedding dimension matches the database.

## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Browser-visible Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Browser-visible Supabase anon key |
| `SUPABASE_URL` | Yes | API Supabase project URL |
| `SUPABASE_ANON_KEY` | Yes | API anon key used with caller JWTs |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Used only for the database health check |
| `WEB_URL` | Yes | Allowed API CORS origin |
| `NEXT_PUBLIC_API_URL` | Yes | API base URL used by the frontend |
| `PORT` | No | NestJS port; defaults to `3001` |
| `OPENROUTER_API_KEY` | Conditional | Shared fallback key for default OpenRouter setup |
| `AI_CHAT_PROVIDER` | Yes | `openai-compatible` or `ollama` |
| `AI_CHAT_BASE_URL` | Yes | Chat API base URL |
| `AI_CHAT_API_KEY` | Conditional | Provider-specific chat key |
| `AI_CHAT_MODEL` | Yes | Provider chat model identifier |
| `AI_EMBEDDING_PROVIDER` | Yes | `openai-compatible` or `ollama` |
| `AI_EMBEDDING_BASE_URL` | Yes | Embedding API base URL |
| `AI_EMBEDDING_API_KEY` | Conditional | Provider-specific embedding key |
| `AI_EMBEDDING_MODEL` | Yes | Provider embedding model identifier |
| `AI_EMBEDDING_DIMENSIONS` | Yes | Expected embedding output size |
| `DB_VECTOR_DIMENSIONS` | Yes | pgvector column dimension; currently `1536` |
| `RAG_TOP_K` | No | Maximum retrieved chunks; defaults to `5` |
| `RAG_SIMILARITY_THRESHOLD` | No | Minimum cosine similarity; defaults to `0.2` |
| `RAG_CHUNK_SIZE` | No | Chunk size in characters; defaults to `800` |
| `RAG_CHUNK_OVERLAP` | No | Chunk overlap in characters; defaults to `120` |

## API Summary

All routes except health require `Authorization: Bearer <supabase-access-token>`.

| Method | Route | Description |
| --- | --- | --- |
| `GET` | `/api/v1/health` | Application and database status |
| `GET` | `/api/v1/documents` | List the current user's documents |
| `POST` | `/api/v1/documents` | Create and index a document |
| `POST` | `/api/v1/documents/upload` | Upload and index PDF or TXT |
| `GET` | `/api/v1/documents/:id` | Retrieve a document |
| `PATCH` | `/api/v1/documents/:id` | Update and reindex a document |
| `DELETE` | `/api/v1/documents/:id` | Delete a document |
| `POST` | `/api/v1/documents/reindex` | Reindex all current-user documents |
| `GET` | `/api/v1/documents/:id/chunks/:chunkIndex` | Retrieve citation offsets |
| `GET` | `/api/v1/conversations` | List conversations |
| `POST` | `/api/v1/conversations` | Create a conversation |
| `GET` | `/api/v1/conversations/:id/messages` | List conversation messages |
| `DELETE` | `/api/v1/conversations/:id` | Delete a conversation |
| `POST` | `/api/v1/chat/:conversationId/messages` | Stream a grounded response |
| `GET` | `/api/v1/settings/ai` | Read model settings |
| `PATCH` | `/api/v1/settings/ai` | Update model settings |
| `GET` | `/api/v1/usage/summary` | Read token usage summary |

See [API reference](docs/API.md) for payloads and SSE event shapes.

## Testing and CI

Current automated tests cover:

- AI provider resolution
- API-key fallback behavior
- Embedding dimension validation
- Chunk overlap and source offsets
- Blank-document chunking
- Grounding prompt construction
- Empty-corpus prompt behavior
- Structured Zod validation errors
- Internal error redaction
- Staged ingestion activation ordering
- Failed-ingestion cleanup
- Authenticated mobile navigation to usage
- Mobile usage-card viewport and horizontal-overflow behavior

GitHub Actions runs:

```text
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm exec playwright install --with-deps chromium
pnpm test:e2e
```

## Known Constraints

- The database vector dimension is fixed at 1536.
- Reindexing currently runs synchronously inside the API request.
- Uploaded PDFs must contain extractable text; OCR is not included.
- Usage values depend on the provider returning token usage.
- Model selection in the UI is curated for the default OpenRouter configuration.
- Supabase RLS and vector RPC behavior require a real Supabase project for full integration testing.

## What I Would Improve With More Time

1. Move ingestion and corpus reindexing to a durable background queue.
2. Add hybrid lexical and vector retrieval.
3. Introduce a reranker through the existing `RerankProvider` port.
4. Build an evaluation dataset and report precision@k, recall, MRR, and grounded-answer quality.
5. Add automated Supabase integration tests for RLS and RPC behavior.
6. Add ingestion progress, retry, and failed-job visibility.
7. Add OCR for scanned PDFs.
8. Add structured logs, traces, and provider latency metrics.
9. Add pagination for large document and conversation collections.
10. Add cost estimation alongside token usage.

## Detailed Documentation

- [Local setup and troubleshooting](docs/SETUP.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Database and security](docs/DATABASE_AND_SECURITY.md)
- [RAG pipeline](docs/RAG_PIPELINE.md)
- [AI provider configuration](docs/AI_PROVIDERS.md)
- [API reference](docs/API.md)
- [Testing and quality](docs/TESTING.md)
- [Five-minute Loom script](docs/LOOM_SCRIPT.md)
- [AI-assisted development walkthrough](docs/AI_USAGE.md)

## Submission Checklist

- [ ] Add the application Loom URL
- [ ] Add the AI-usage Loom URL
- [ ] Push the complete repository to GitHub
- [ ] Invite `team@goodspeed.studio` if the repository is private
- [ ] Confirm CI passes on the submitted commit
- [ ] Verify setup from a clean clone
- [ ] Apply all Supabase migrations
- [ ] Test signup, document ingestion, chat, citations, reindexing, and logout
- [ ] Test data isolation with two different users
