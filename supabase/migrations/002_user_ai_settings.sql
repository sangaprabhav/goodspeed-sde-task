-- Per-user chat model preference (embedding prefs already in corpus_config)
ALTER TABLE corpus_config
  ADD COLUMN IF NOT EXISTS chat_model text NOT NULL DEFAULT 'openai/gpt-4o-mini';

-- Keep signup defaults in sync
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
