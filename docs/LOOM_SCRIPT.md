# Five-Minute Application Loom Script

Use this as a spoken guide. Keep the browser, terminal, and repository ready before recording.

## Preparation

Before recording:

1. Sign in with a prepared account.
2. Have one useful document already indexed.
3. Keep a second short document ready to create or upload.
4. Open the repository in the editor.
5. Open `packages/ai/src/ports`, `ingestion.service.ts`, and the migrations.
6. Confirm `pnpm check` has passed.
7. Keep the video under five minutes.

## 0:00-0:20 - Introduction

"Hi, I'm Prabhav. This is my submission for the Goodspeed Software Developer Technical Assessment.

I built an AI-powered knowledge base where authenticated users can manage documents and ask grounded questions through a retrieval-augmented chat interface.

The project uses Turborepo, Next.js, NestJS, Supabase with pgvector, and a provider-agnostic AI package."

## 0:20-1:00 - Authentication and Documents

"I'll start in the application.

Authentication uses Supabase email and password. The browser sends the Supabase access token to NestJS, the API validates it, and database Row Level Security ensures users can only access their own records.

On the Documents page I can create, edit, tag, search, upload, and delete documents. Upload supports TXT and text-based PDF files.

I'll open this document and update its content. Saving also starts the embedding and indexing workflow."

Perform:

- Open Documents
- Show existing documents and tags
- Open or create one document
- Make a small content change
- Save

## 1:00-1:45 - RAG and Atomic Ingestion

"The backend splits content into approximately 800-character chunks with a 120-character overlap.

It prefers natural boundaries such as paragraphs, lines, sentence endings, and spaces. Each chunk also stores source character offsets, which later lets citations highlight the exact passage.

Embeddings are generated in batches and stored in pgvector.

Reindexing is versioned and atomic. New chunks are staged under a new ingestion ID while the existing index remains active. Only after every new chunk is stored does a PostgreSQL function activate the new version and remove the old one.

That means an embedding-provider failure cannot destroy a previously valid index."

Show:

- `chunker.service.ts`
- `ingestion.service.ts`
- `activate_document_ingestion` migration

## 1:45-2:35 - Chat and Citations

"Now I'll ask a question whose answer is contained in the documents."

Ask the prepared question.

"The user message appears immediately and the response streams from NestJS through Server-Sent Events.

For retrieval, the backend embeds the question and calls a pgvector similarity-search function. Search is filtered by user, embedding model, dimensions, and the document's active ingestion version.

Low-relevance chunks are removed using a configurable similarity threshold. The remaining context is placed into a prompt that tells the model to answer only from the supplied documents and admit when the answer is unavailable.

The answer includes source citations. Clicking this citation opens the original document and highlights the passage used."

Perform:

- Show streaming answer
- Click a citation
- Show highlighted source passage

## 2:35-3:30 - Provider-Agnostic AI Layer

Switch to the repository.

"A key requirement was provider independence.

The `packages/ai` workspace defines application-owned `ChatProvider` and `EmbeddingProvider` interfaces. NestJS depends on these ports rather than directly using OpenAI request or response types.

The OpenAI-compatible adapters accept a base URL, key, and model, which supports OpenAI, OpenRouter, Groq, Together AI, and similar APIs through configuration.

There are also native Ollama adapters.

Chat and embeddings are independent, so I can use Groq or Ollama for chat and a separate provider for embeddings.

The database currently uses 1536-dimensional vectors. Providers are configuration-swappable when their embedding model matches that dimension. A different vector dimension correctly requires a database migration and full reindex."

Show:

- Provider ports
- Adapters
- Registry
- `.env.example`

## 3:30-4:10 - Security, Persistence, and Stretch Goals

"Conversations and messages persist across sessions.

I also implemented streaming, source citations, exact source highlighting, PDF and TXT uploads, model settings, and token usage tracking.

For security, all user-owned tables have RLS policies. The API forwards the caller's JWT for data operations rather than using the service-role key. Assistant Markdown is sanitized, inputs are validated with Zod, and chat requests are rate limited."

Show:

- Conversation sidebar
- Settings
- Usage
- RLS migration briefly

## 4:10-4:40 - Developer Experience and Quality

"The monorepo separates the web app, API, shared types, provider package, and migrations.

A developer can run `pnpm setup`, configure the generated environment file, apply the migrations, and start both applications with `pnpm dev`.

The complete quality gate is `pnpm check`. It runs linting, TypeScript checks, 15 focused tests, and both production builds. The same checks run in GitHub Actions."

Show:

- README
- CI workflow
- Successful `pnpm check` output

## 4:40-5:00 - Closing

"With more time, I would move ingestion into a durable queue, add hybrid keyword and vector retrieval, build a retrieval evaluation dataset, and add Supabase integration tests.

My priorities for this submission were secure tenant isolation, reliable indexing, grounded answers, a genuinely replaceable AI layer, and a codebase another engineer could extend.

Thank you for reviewing my submission."

## Recording Tips

- Keep code scrolling minimal.
- Demonstrate citations rather than describing every UI component.
- Spend the most time on atomic ingestion, RLS, and provider abstraction.
- Do not claim that arbitrary vector dimensions are runtime-swappable.
- Mention the 1536-dimensional database constraint directly.
- Avoid waiting for a long reindex during the recording; use a short document.
