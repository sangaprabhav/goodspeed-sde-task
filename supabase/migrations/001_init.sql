-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Corpus config: pins embedding space + chat model per user
CREATE TABLE corpus_config (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  chat_model text NOT NULL DEFAULT 'openai/gpt-4o-mini',
  embedding_model text NOT NULL,
  embedding_dimensions int NOT NULL,
  embedding_provider_id text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) <= 200),
  content text NOT NULL DEFAULT '',
  tags text[] DEFAULT '{}',
  active_ingestion_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE document_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ingestion_id uuid NOT NULL,
  chunk_index int NOT NULL,
  content text NOT NULL,
  embedding vector(1536) NOT NULL,
  embedding_model text NOT NULL,
  embedding_dimensions int NOT NULL,
  embedding_provider_id text NOT NULL,
  token_count int,
  start_offset int,
  end_offset int,
  created_at timestamptz DEFAULT now(),
  UNIQUE (document_id, ingestion_id, chunk_index)
);

CREATE TABLE conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'New conversation',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content text NOT NULL,
  citations jsonb DEFAULT '[]',
  token_usage jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  operation text NOT NULL,
  model text NOT NULL,
  prompt_tokens int DEFAULT 0,
  completion_tokens int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX documents_user_id_idx ON documents(user_id);
CREATE INDEX chunks_user_embedding_idx ON document_chunks(user_id, embedding_model, embedding_dimensions);
CREATE INDEX chunks_embedding_hnsw ON document_chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX conversations_user_id_idx ON conversations(user_id);
CREATE INDEX messages_conversation_id_idx ON messages(conversation_id);
CREATE INDEX usage_events_user_id_idx ON usage_events(user_id);

-- Vector similarity search RPC
CREATE OR REPLACE FUNCTION match_document_chunks(
  query_embedding vector(1536),
  match_count int,
  filter_user_id uuid,
  filter_embedding_model text,
  filter_embedding_dimensions int
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  content text,
  chunk_index int,
  document_title text,
  similarity float
)
LANGUAGE sql STABLE AS $$
  SELECT
    c.id,
    c.document_id,
    c.content,
    c.chunk_index,
    d.title AS document_title,
    1 - (c.embedding <=> query_embedding) AS similarity
  FROM document_chunks c
  JOIN documents d ON d.id = c.document_id
  WHERE c.user_id = filter_user_id
    AND c.ingestion_id = d.active_ingestion_id
    AND c.embedding_model = filter_embedding_model
    AND c.embedding_dimensions = filter_embedding_dimensions
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Atomically makes a fully staged chunk set visible and removes older sets.
CREATE OR REPLACE FUNCTION activate_document_ingestion(
  p_document_id uuid,
  p_ingestion_id uuid,
  p_user_id uuid,
  p_embedding_model text,
  p_embedding_dimensions int,
  p_embedding_provider_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Cannot activate another user''s document';
  END IF;

  UPDATE documents
  SET active_ingestion_id = p_ingestion_id
  WHERE id = p_document_id AND user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Document not found';
  END IF;

  INSERT INTO corpus_config (
    user_id,
    embedding_model,
    embedding_dimensions,
    embedding_provider_id
  )
  VALUES (
    p_user_id,
    p_embedding_model,
    p_embedding_dimensions,
    p_embedding_provider_id
  )
  ON CONFLICT (user_id) DO UPDATE SET
    embedding_model = EXCLUDED.embedding_model,
    embedding_dimensions = EXCLUDED.embedding_dimensions,
    embedding_provider_id = EXCLUDED.embedding_provider_id,
    updated_at = now();

  DELETE FROM document_chunks
  WHERE document_id = p_document_id
    AND ingestion_id <> p_ingestion_id;
END;
$$;

-- RLS
ALTER TABLE corpus_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY corpus_config_owner ON corpus_config
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY documents_owner ON documents
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY document_chunks_owner ON document_chunks
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY conversations_owner ON conversations
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY messages_owner ON messages
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY usage_events_owner ON usage_events
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Auto-init corpus_config on signup
CREATE OR REPLACE FUNCTION public.init_corpus_config()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.corpus_config (
    user_id,
    chat_model,
    embedding_model,
    embedding_dimensions,
    embedding_provider_id
  )
  VALUES (
    NEW.id,
    'openai/gpt-4o-mini',
    'openai/text-embedding-3-small',
    1536,
    'openai-compatible'
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.init_corpus_config();

-- Updated_at trigger for documents
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
