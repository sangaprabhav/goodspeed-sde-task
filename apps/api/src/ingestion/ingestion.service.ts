import { Injectable } from '@nestjs/common';
import type { EmbeddingProvider } from '@repo/ai';
import { EMBED_BATCH_SIZE } from '@repo/shared';
import type { SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { UserAIService } from '../ai/user-ai.service';
import { SupabaseService } from '../supabase/supabase.service';
import { ChunkerService } from './chunker.service';

type ChunkRow = {
  document_id: string;
  user_id: string;
  chunk_index: number;
  content: string;
  start_offset?: number;
  end_offset?: number;
  ingestion_id: string;
  embedding: string;
  embedding_model: string;
  embedding_dimensions: number;
  embedding_provider_id: string;
  token_count: number;
};

@Injectable()
export class IngestionService {
  constructor(
    private readonly userAI: UserAIService,
    private readonly supabase: SupabaseService,
    private readonly chunker: ChunkerService,
  ) {}

  async getEmbeddingProvider(
    userId: string,
    accessToken: string,
  ): Promise<EmbeddingProvider> {
    const ai = await this.userAI.getRegistryForUser(userId, accessToken);
    return ai.embedding;
  }

  async ingestDocument(
    documentId: string,
    userId: string,
    content: string,
    accessToken: string,
  ): Promise<{ chunkCount: number; embeddingModel: string }> {
    const provider = await this.getEmbeddingProvider(userId, accessToken);
    const client = this.supabase.getClient(accessToken);
    const ingestionId = randomUUID();
    const chunks = this.chunker.chunk(content);

    try {
      for (let i = 0; i < chunks.length; i += EMBED_BATCH_SIZE) {
        const batch = chunks.slice(i, i + EMBED_BATCH_SIZE);
        const texts = batch.map((c) => c.text);
        const embeddings = await provider.embed(texts);

        const rows: ChunkRow[] = embeddings.map((emb, idx) => {
          const chunk = batch[idx]!;
          return {
            document_id: documentId,
            user_id: userId,
            ingestion_id: ingestionId,
            chunk_index: i + idx,
            content: chunk.text,
            start_offset: chunk.startOffset,
            end_offset: chunk.endOffset,
            embedding: JSON.stringify(emb.vector),
            embedding_model: provider.model,
            embedding_dimensions: provider.dimensions,
            embedding_provider_id: provider.id,
            token_count: Math.ceil(chunk.text.length / 4),
          };
        });

        await this.insertChunkRows(client, rows);
      }

      const { error: activationError } = await client.rpc(
        'activate_document_ingestion',
        {
          p_document_id: documentId,
          p_ingestion_id: ingestionId,
          p_user_id: userId,
          p_embedding_model: provider.model,
          p_embedding_dimensions: provider.dimensions,
          p_embedding_provider_id: provider.id,
        },
      );

      if (activationError) {
        throw new Error(`Failed to activate document index: ${activationError.message}`);
      }

      return { chunkCount: chunks.length, embeddingModel: provider.model };
    } catch (error) {
      await client
        .from('document_chunks')
        .delete()
        .eq('document_id', documentId)
        .eq('ingestion_id', ingestionId);
      throw error;
    }
  }

  private async insertChunkRows(client: SupabaseClient, rows: ChunkRow[]): Promise<void> {
    const { error } = await client.from('document_chunks').insert(rows);
    if (!error) return;

    const missingOffsetColumn =
      error.message.includes('start_offset') || error.message.includes('end_offset');

    if (missingOffsetColumn) {
      const withoutOffsets = rows.map(
        ({ start_offset: _s, end_offset: _e, ...rest }) => rest,
      );
      const { error: retryError } = await client
        .from('document_chunks')
        .insert(withoutOffsets);
      if (!retryError) return;
      throw new Error(`Failed to insert chunks: ${retryError.message}`);
    }

    throw new Error(`Failed to insert chunks: ${error.message}`);
  }

  async reindexAll(
    userId: string,
    accessToken: string,
  ): Promise<{ documentsProcessed: number; totalChunks: number }> {
    const client = this.supabase.getClient(accessToken);

    const { data: documents, error } = await client
      .from('documents')
      .select('id, content')
      .eq('user_id', userId);

    if (error) throw new Error(error.message);

    let totalChunks = 0;
    for (const doc of documents ?? []) {
      const result = await this.ingestDocument(doc.id, userId, doc.content, accessToken);
      totalChunks += result.chunkCount;
    }

    return { documentsProcessed: documents?.length ?? 0, totalChunks };
  }
}
