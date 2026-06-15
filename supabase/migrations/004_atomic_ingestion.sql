-- Stage document chunks under a new ingestion ID, then atomically activate them.
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS active_ingestion_id uuid;

ALTER TABLE document_chunks
  ADD COLUMN IF NOT EXISTS ingestion_id uuid;

UPDATE documents
SET active_ingestion_id = gen_random_uuid()
WHERE active_ingestion_id IS NULL;

UPDATE document_chunks AS chunks
SET ingestion_id = documents.active_ingestion_id
FROM documents
WHERE chunks.document_id = documents.id
  AND chunks.ingestion_id IS NULL;

ALTER TABLE document_chunks
  ALTER COLUMN ingestion_id SET NOT NULL;

ALTER TABLE document_chunks
  DROP CONSTRAINT IF EXISTS document_chunks_document_id_chunk_index_key;

ALTER TABLE document_chunks
  DROP CONSTRAINT IF EXISTS document_chunks_document_id_ingestion_id_chunk_index_key;

ALTER TABLE document_chunks
  DROP CONSTRAINT IF EXISTS document_chunks_document_ingestion_chunk_key;

ALTER TABLE document_chunks
  ADD CONSTRAINT document_chunks_document_ingestion_chunk_key
  UNIQUE (document_id, ingestion_id, chunk_index);

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
    chunks.id,
    chunks.document_id,
    chunks.content,
    chunks.chunk_index,
    documents.title AS document_title,
    1 - (chunks.embedding <=> query_embedding) AS similarity
  FROM document_chunks AS chunks
  JOIN documents ON documents.id = chunks.document_id
  WHERE chunks.user_id = filter_user_id
    AND chunks.ingestion_id = documents.active_ingestion_id
    AND chunks.embedding_model = filter_embedding_model
    AND chunks.embedding_dimensions = filter_embedding_dimensions
  ORDER BY chunks.embedding <=> query_embedding
  LIMIT match_count;
$$;

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
