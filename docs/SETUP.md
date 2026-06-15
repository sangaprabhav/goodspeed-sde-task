# Local Setup and Troubleshooting

## Prerequisites

- Node.js 22+
- pnpm 9.15+
- Supabase project access
- AI provider credentials

Confirm local versions:

```bash
node --version
pnpm --version
```

## Installation

From the repository root:

```bash
pnpm setup
```

The setup command:

1. Installs all workspace dependencies.
2. Installs the Chromium browser used by the Playwright end-to-end test.
3. Copies `.env.example` to `.env` when no `.env` exists.
4. Prints the remaining database and startup steps.

It never overwrites an existing `.env`.

If Chromium is already installed in Playwright's cache, that step is reused.

## Supabase Configuration

Create a Supabase project, then copy values from **Project Settings > API**.

```env
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_URL=https://PROJECT.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

The frontend requires the `NEXT_PUBLIC_*` variables. The API requires the server-side variables.

Do not expose `SUPABASE_SERVICE_ROLE_KEY` to the browser or commit it to Git.

## Database Migrations

Open the Supabase SQL editor and apply:

1. `001_init.sql`
2. `002_user_ai_settings.sql`
3. `003_chunk_offsets.sql`
4. `004_atomic_ingestion.sql`

The first migration creates:

- pgvector extension
- User-owned tables
- HNSW vector index
- Vector search function
- RLS policies
- Signup and timestamp triggers

The later migrations add per-user settings, citation offsets, and atomic ingestion versioning.

## Authentication Configuration

In Supabase:

1. Enable the email authentication provider.
2. Decide whether local users must confirm email.
3. If confirmation remains enabled, confirm the account before testing login.
4. Add the local web URL to allowed redirect URLs if required.

The app supports email/password signup and login.

## AI Configuration

The shortest setup uses OpenRouter:

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

See [AI_PROVIDERS.md](AI_PROVIDERS.md) for alternatives.

## Starting Development

```bash
pnpm dev
```

Expected services:

| Service | URL |
| --- | --- |
| Next.js | `http://localhost:3000` |
| NestJS | `http://localhost:3001` |
| Health | `http://localhost:3001/api/v1/health` |

Turborepo starts both application workspaces and keeps them running.

## Recommended Smoke Test

1. Create an account.
2. Create a document containing a distinctive fact.
3. Confirm the save response reports indexed chunks.
4. Start a new conversation.
5. Ask a question whose answer exists in the document.
6. Confirm the response streams.
7. Open a citation and verify the source passage is highlighted.
8. Edit the document and ask about the updated content.
9. Open Usage and confirm the chat operation appears when the provider supplies usage.
10. Sign out and verify protected pages redirect to login.

## Tenant-Isolation Test

Use two accounts:

1. Create a document and conversation as User A.
2. Sign out.
3. Sign in as User B.
4. Confirm User A's documents and conversations are absent.
5. Attempt direct API access to a known User A document ID with User B's token.
6. Confirm the API returns not found or an empty result.

This tests both application filtering and database RLS.

## Quality Gate

```bash
pnpm check
```

The command must complete all four phases:

1. Lint
2. Typecheck
3. Tests
4. Production builds

## Common Problems

### Signup succeeds but login does not

Supabase email confirmation may be enabled. Confirm the address or disable confirmation for local evaluation.

### The health endpoint is degraded

Check `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. The health endpoint uses the service role only to test database connectivity.

### Document creation fails during indexing

Check:

- AI embedding API key
- Embedding base URL
- Embedding model availability
- `AI_EMBEDDING_DIMENSIONS=1536`
- `DB_VECTOR_DIMENSIONS=1536`
- Database migrations, particularly `004_atomic_ingestion.sql`

### Vector dimension mismatch

The schema uses `vector(1536)`. Select an embedding model that returns 1536 dimensions, or perform a deliberate schema migration and full reindex.

### Chat returns no relevant context

Confirm documents were indexed. Then inspect:

- `RAG_TOP_K`
- `RAG_SIMILARITY_THRESHOLD`
- Active embedding model
- Whether a reindex is required after changing models

Temporarily lowering the similarity threshold can help diagnose retrieval, but production tuning should use an evaluation set.

### PDF upload reports no text

The PDF is probably scanned or image-based. This project uses text extraction and does not include OCR.

### CORS errors

Set:

```env
WEB_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3001
```

Restart both development servers after changing `.env`.

### Port already in use

Change `PORT` for the API and update `NEXT_PUBLIC_API_URL` accordingly. The Next.js script currently uses port 3000.
