# Database and Security

## Schema

### `corpus_config`

Stores per-user model choices and the current embedding-space metadata.

Key columns:

- `user_id`
- `chat_model`
- `embedding_model`
- `embedding_dimensions`
- `embedding_provider_id`

### `documents`

Stores user-authored source content.

Key columns:

- `id`
- `user_id`
- `title`
- `content`
- `tags`
- `active_ingestion_id`
- `created_at`
- `updated_at`

`active_ingestion_id` identifies the only chunk set visible to retrieval.

### `document_chunks`

Stores retrieval units and vectors.

Key columns:

- `document_id`
- `user_id`
- `ingestion_id`
- `chunk_index`
- `content`
- `embedding vector(1536)`
- `embedding_model`
- `embedding_dimensions`
- `embedding_provider_id`
- `start_offset`
- `end_offset`

The unique key is `(document_id, ingestion_id, chunk_index)`.

### `conversations`

Stores persistent user chat sessions.

### `messages`

Stores user and assistant messages, citations, and provider token usage.

### `usage_events`

Stores chat usage records for the usage summary page.

## Indexes

- B-tree indexes for user-owned list queries
- Message index for conversation history
- HNSW index on `document_chunks.embedding`
- Compound metadata index for user and embedding-space filtering

The HNSW index uses cosine operators.

## Vector Search Function

`match_document_chunks`:

1. Accepts a 1536-dimensional query vector.
2. Filters by user ID.
3. Filters by embedding model and dimensions.
4. Joins only the document's active ingestion version.
5. Orders by cosine distance.
6. Returns similarity as `1 - cosine_distance`.

The API applies a configurable similarity threshold after retrieval.

## Atomic Activation Function

`activate_document_ingestion`:

1. Verifies the authenticated database user matches `p_user_id`.
2. Updates `documents.active_ingestion_id`.
3. Updates embedding metadata in `corpus_config`.
4. Deletes prior chunk versions.

All operations occur in one PostgreSQL transaction because they execute inside one function call.

## Row Level Security

RLS is enabled for:

- `corpus_config`
- `documents`
- `document_chunks`
- `conversations`
- `messages`
- `usage_events`

Each policy uses:

```sql
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id)
```

This covers reads, inserts, updates, and deletes.

## API Authorization

The `SupabaseAuthGuard`:

1. Requires a bearer token.
2. Creates a Supabase client with that token.
3. Calls `auth.getUser(token)`.
4. Places the verified user and access token on the request.

Controllers obtain these through custom decorators.

Services use the caller-token client and generally filter by `user_id` as defense in depth.

## Service Role Usage

The service role bypasses RLS and must be treated as a server secret.

This project uses it only in the unauthenticated health endpoint to check database connectivity. User content operations use the caller's JWT.

## Input and Output Controls

- Zod validates document, chat, and settings payloads.
- Document titles, tags, content, and messages have explicit limits.
- Uploads are restricted to PDF and TXT-compatible formats.
- Multer enforces upload size limits.
- PDF extraction errors become controlled client errors.
- Assistant Markdown passes through `rehype-sanitize`.
- The global exception filter hides unexpected internal error messages.

## Rate Limiting

The application has:

- A global NestJS throttling guard
- A stricter chat endpoint limit of 20 requests per minute

Production deployments should replace the default in-memory throttling store when running multiple API instances.

## Security Verification Checklist

- [ ] Create two users and verify cross-user rows are inaccessible
- [ ] Confirm `.env` is not tracked
- [ ] Confirm service role never appears in frontend bundles
- [ ] Confirm invalid tokens return 401
- [ ] Confirm oversized uploads fail
- [ ] Confirm invalid Zod payloads return structured 400 responses
- [ ] Confirm assistant HTML/script content is sanitized
- [ ] Confirm chat rate limiting works

## Production Hardening

Further production controls would include:

- Secret manager integration
- Restricted health endpoint or a less privileged database probe
- Distributed rate limiting
- Audit logging
- Security headers tuned for deployment
- Dependency and container scanning
- Backup and restore testing
- Database statement timeouts
- Prompt-injection evaluation and content-policy controls
