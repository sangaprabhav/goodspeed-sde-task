-- Character offsets for citation highlighting in source documents
ALTER TABLE document_chunks
  ADD COLUMN IF NOT EXISTS start_offset int,
  ADD COLUMN IF NOT EXISTS end_offset int;
