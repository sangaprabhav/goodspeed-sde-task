# API Reference

## Base URL

Local development:

```text
http://localhost:3001/api/v1
```

## Authentication

All routes except `GET /health` require:

```http
Authorization: Bearer <supabase-access-token>
```

## Error Format

```json
{
  "code": "VALIDATION_ERROR",
  "message": "title: String must contain at least 1 character(s)"
}
```

Known codes:

- `UNAUTHORIZED`
- `NOT_FOUND`
- `EMBEDDING_SPACE_MISMATCH`
- `DIMENSION_OVERFLOW`
- `PROVIDER_ERROR`
- `RATE_LIMITED`
- `PAYLOAD_TOO_LARGE`
- `VALIDATION_ERROR`

## Health

### `GET /health`

No authentication required.

Example response:

```json
{
  "status": "healthy",
  "database": "ok",
  "ai": {
    "chatProvider": "openai-compatible",
    "embeddingProvider": "openai-compatible",
    "embeddingModel": "openai/text-embedding-3-small",
    "embeddingDimensions": 1536
  }
}
```

## Documents

### `GET /documents`

Returns current-user documents ordered by most recently updated.

### `POST /documents`

```json
{
  "title": "Project notes",
  "content": "The project uses NestJS and Next.js.",
  "tags": ["architecture", "typescript"]
}
```

Example response:

```json
{
  "id": "uuid",
  "userId": "uuid",
  "title": "Project notes",
  "content": "The project uses NestJS and Next.js.",
  "tags": ["architecture", "typescript"],
  "createdAt": "2026-06-13T00:00:00.000Z",
  "updatedAt": "2026-06-13T00:00:00.000Z",
  "ingestion": {
    "chunkCount": 1,
    "embeddingModel": "openai/text-embedding-3-small"
  }
}
```

### `POST /documents/upload`

Content type:

```text
multipart/form-data
```

Field:

```text
file
```

Supported files:

- PDF
- TXT
- Markdown-compatible text uploads where detected as text

The frontend currently advertises PDF and TXT.

### `GET /documents/:id`

Returns one current-user document.

### `PATCH /documents/:id`

Any subset is accepted:

```json
{
  "title": "Updated title",
  "content": "Updated content",
  "tags": ["updated"]
}
```

Supplying `content` triggers reindexing.

If reindexing fails, the API restores the previous source content and leaves the previous active chunk set intact.

### `DELETE /documents/:id`

```json
{
  "success": true
}
```

### `POST /documents/reindex`

Reindexes every document owned by the caller.

```json
{
  "documentsProcessed": 3,
  "totalChunks": 18
}
```

### `GET /documents/:id/chunks/:chunkIndex`

Used for citation highlighting.

```json
{
  "chunkIndex": 2,
  "content": "Retrieved chunk text",
  "startOffset": 1240,
  "endOffset": 1984
}
```

## Conversations

### `GET /conversations`

Returns conversations ordered by update time.

### `POST /conversations`

```json
{
  "title": "Optional title"
}
```

The title can be omitted. The first user message generates a concise default title.

### `GET /conversations/:id/messages`

Returns persisted messages in chronological order.

Example assistant message:

```json
{
  "id": "uuid",
  "conversationId": "uuid",
  "userId": "uuid",
  "role": "assistant",
  "content": "The API uses NestJS.",
  "citations": [
    {
      "documentId": "uuid",
      "chunkId": "uuid",
      "title": "Architecture",
      "excerpt": "The API uses NestJS...",
      "score": 0.82,
      "chunkIndex": 0
    }
  ],
  "tokenUsage": {
    "promptTokens": 300,
    "completionTokens": 40,
    "totalTokens": 340
  },
  "createdAt": "2026-06-13T00:00:00.000Z"
}
```

### `DELETE /conversations/:id`

```json
{
  "success": true
}
```

## Streaming Chat

### `POST /chat/:conversationId/messages`

Request:

```json
{
  "content": "What framework does the API use?"
}
```

Response content type:

```text
text/event-stream
```

### Citation event

```text
event: citation
data: {"documentId":"...","chunkId":"...","title":"Architecture","excerpt":"...","score":0.82,"chunkIndex":0}
```

### Token event

```text
event: token
data: {"text":"The"}
```

### Done event

```text
event: done
data: {"messageId":"...","usage":{"promptTokens":300,"completionTokens":40,"totalTokens":340},"citations":[]}
```

### Error event

```text
event: error
data: {"code":"PROVIDER_ERROR","message":"Chat failed"}
```

The endpoint is limited to 20 requests per minute per throttler identity.

## AI Settings

### `GET /settings/ai`

```json
{
  "chatModel": "openai/gpt-4o-mini",
  "embeddingModel": "openai/text-embedding-3-small",
  "embeddingDimensions": 1536,
  "needsReindex": false,
  "chatModels": [],
  "embeddingModels": []
}
```

### `PATCH /settings/ai`

```json
{
  "chatModel": "openai/gpt-4o",
  "embeddingModel": "openai/text-embedding-3-large"
}
```

Changing an embedding model requires reindexing.

## Usage

### `GET /usage/summary`

```json
{
  "totalPromptTokens": 1200,
  "totalCompletionTokens": 300,
  "totalTokens": 1500,
  "byModel": {
    "openai/gpt-4o-mini": {
      "promptTokens": 1200,
      "completionTokens": 300
    }
  },
  "byDay": [
    {
      "date": "2026-06-13",
      "tokens": 1500
    }
  ]
}
```

The summary currently reads the most recent 500 usage events.
