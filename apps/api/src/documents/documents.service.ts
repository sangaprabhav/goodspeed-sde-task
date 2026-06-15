import { Injectable } from '@nestjs/common';
import type { CreateDocumentInput, UpdateDocumentInput } from '@repo/shared';
import { SupabaseService } from '../supabase/supabase.service';
import { IngestionService } from '../ingestion/ingestion.service';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly ingestion: IngestionService,
  ) {}

  async list(userId: string, accessToken: string) {
    const client = this.supabase.getClient(accessToken);
    const { data, error } = await client
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []).map(this.mapDocument);
  }

  async get(userId: string, id: string, accessToken: string) {
    const client = this.supabase.getClient(accessToken);
    const { data, error } = await client
      .from('documents')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !data) return null;
    return this.mapDocument(data);
  }

  async create(userId: string, input: CreateDocumentInput, accessToken: string) {
    const client = this.supabase.getClient(accessToken);
    const { data, error } = await client
      .from('documents')
      .insert({
        user_id: userId,
        title: input.title,
        content: input.content ?? '',
        tags: input.tags ?? [],
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    try {
      const ingestion = await this.ingestion.ingestDocument(
        data.id,
        userId,
        data.content,
        accessToken,
      );
      return { ...this.mapDocument(data), ingestion };
    } catch (ingestError) {
      await client.from('documents').delete().eq('id', data.id);
      throw ingestError;
    }
  }

  async update(
    userId: string,
    id: string,
    input: UpdateDocumentInput,
    accessToken: string,
  ) {
    const client = this.supabase.getClient(accessToken);
    const existing =
      input.content !== undefined
        ? await this.get(userId, id, accessToken)
        : null;

    const { data, error } = await client
      .from('documents')
      .update({
        ...(input.title !== undefined && { title: input.title }),
        ...(input.content !== undefined && { content: input.content }),
        ...(input.tags !== undefined && { tags: input.tags }),
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error || !data) return null;

    let ingestion;
    if (input.content !== undefined) {
      try {
        ingestion = await this.ingestion.ingestDocument(
          id,
          userId,
          data.content,
          accessToken,
        );
      } catch (ingestionError) {
        if (existing) {
          await client
            .from('documents')
            .update({ content: existing.content })
            .eq('id', id)
            .eq('user_id', userId);
        }
        throw ingestionError;
      }
    }

    return { ...this.mapDocument(data), ingestion };
  }

  async remove(userId: string, id: string, accessToken: string) {
    const client = this.supabase.getClient(accessToken);
    const { error } = await client
      .from('documents')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw new Error(error.message);
  }

  async getChunk(
    userId: string,
    documentId: string,
    chunkIndex: number,
    accessToken: string,
  ) {
    const client = this.supabase.getClient(accessToken);

    const withOffsets = await client
      .from('document_chunks')
      .select('chunk_index, content, start_offset, end_offset')
      .eq('document_id', documentId)
      .eq('user_id', userId)
      .eq('chunk_index', chunkIndex)
      .single();

    if (!withOffsets.error && withOffsets.data) {
      return {
        chunkIndex: withOffsets.data.chunk_index as number,
        content: withOffsets.data.content as string,
        startOffset: (withOffsets.data.start_offset as number | null) ?? null,
        endOffset: (withOffsets.data.end_offset as number | null) ?? null,
      };
    }

    const missingOffsetColumn =
      withOffsets.error?.message.includes('start_offset') ||
      withOffsets.error?.message.includes('end_offset');

    if (!missingOffsetColumn) return null;

    const { data, error } = await client
      .from('document_chunks')
      .select('chunk_index, content')
      .eq('document_id', documentId)
      .eq('user_id', userId)
      .eq('chunk_index', chunkIndex)
      .single();

    if (error || !data) return null;

    return {
      chunkIndex: data.chunk_index as number,
      content: data.content as string,
      startOffset: null,
      endOffset: null,
    };
  }

  private mapDocument(row: Record<string, unknown>) {
    return {
      id: row.id as string,
      userId: row.user_id as string,
      title: row.title as string,
      content: row.content as string,
      tags: (row.tags as string[]) ?? [],
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }
}
