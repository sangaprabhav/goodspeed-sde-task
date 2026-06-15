# Testing and Quality

## Complete Verification

Run:

```bash
pnpm check
```

The command executes:

```text
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

## Unit Tests

### AI package

The registry suite verifies:

- OpenAI-compatible provider resolution
- Ollama chat resolution
- OpenRouter key fallback
- Default environment behavior
- Database vector-dimension enforcement

### API

The API suite verifies:

- Chunk overlap
- Source offset correctness
- Blank-content behavior
- Prompt grounding
- Empty-corpus prompt behavior
- Document inventory intent routing
- Deterministic complete inventory formatting
- Zod error mapping
- Internal error redaction
- Staging before ingestion activation
- Staged-row cleanup after provider failure

## End-to-End Test

The Playwright suite runs one deterministic mobile Chromium journey:

1. Sign in through the real login UI.
2. Create and enter a conversation through the real application route.
3. Open the mobile navigation drawer.
4. Navigate to the usage page.
5. Render usage data through TanStack Query.
6. Verify all summary cards remain inside the viewport.
7. Verify the document has no horizontal overflow.

Supabase and API network boundaries are mocked so the test is reliable in CI and does not require evaluator credentials.

```bash
pnpm test:e2e
```

## Running Individual Suites

```bash
pnpm --filter @repo/ai test
pnpm --filter @repo/api test
```

## Linting

The root ESLint flat configuration covers TypeScript across the monorepo. The web workspace also includes Next.js core-web-vitals rules.

```bash
pnpm lint
```

## Type Checking

```bash
pnpm typecheck
```

Shared packages build before dependent workspace checks through Turborepo.

## Production Builds

```bash
pnpm build
```

This compiles:

- `packages/shared`
- `packages/ai`
- NestJS API
- Next.js application

## Continuous Integration

The GitHub Actions workflow:

1. Checks out the repository.
2. Installs pnpm 9.15.
3. Uses Node.js 22.
4. Runs a frozen-lockfile install.
5. Runs lint.
6. Runs typecheck.
7. Runs tests.
8. Runs production builds.

## Manual Acceptance Test

### Authentication

- [ ] Signup succeeds
- [ ] Confirmed user can sign in
- [ ] Invalid password displays an error
- [ ] Logout clears access
- [ ] Protected routes redirect when signed out

### Documents

- [ ] Create a document
- [ ] Edit title, tags, and content
- [ ] Delete a document
- [ ] Upload TXT
- [ ] Upload text-based PDF
- [ ] Reject unsupported or empty files
- [ ] Search by title and tag

### Ingestion

- [ ] Creation reports a chunk count
- [ ] Updating content replaces searchable knowledge
- [ ] Reindex processes all documents
- [ ] Invalid embedding key does not remove an existing active index
- [ ] Empty content activates an empty index cleanly

### Chat

- [ ] User message renders immediately
- [ ] Assistant tokens stream
- [ ] Conversation persists after refresh
- [ ] First message creates a useful title
- [ ] Relevant citations display
- [ ] Citation opens highlighted source text
- [ ] Unanswerable question does not invent a document answer
- [ ] Stop button cancels the browser stream

### Security

- [ ] User B cannot list User A documents
- [ ] User B cannot access User A document ID
- [ ] User B cannot access User A conversation
- [ ] Invalid JWT returns 401
- [ ] Invalid payload returns structured 400

### Provider Switching

- [ ] Default OpenRouter setup works
- [ ] Alternative chat provider works with hosted embeddings
- [ ] Dimension mismatch fails clearly
- [ ] Embedding-model change shows reindex guidance

## Missing Integration Coverage

The repository does not currently create an ephemeral Supabase environment in CI. Therefore, the following are manually verified:

- RLS policy execution
- Auth triggers
- PostgreSQL vector RPC behavior
- HNSW index behavior
- Atomic activation function behavior in a real transaction

The SQL design and API unit tests cover these contracts structurally, but a production repository should add Supabase CLI integration tests.

## Suggested Future Test Layers

1. Supabase CLI database tests
2. NestJS HTTP integration tests
3. Browser tests for auth, CRUD, and streaming
4. Provider contract tests with mocked HTTP servers
5. RAG evaluation fixtures
6. Load tests for ingestion and SSE concurrency
