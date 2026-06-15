import { describe, expect, it, vi } from 'vitest';
import { IngestionService } from './ingestion.service';

function deleteChain() {
  const result = Promise.resolve({ error: null });
  const chain = {
    eq: vi.fn(() => chain),
    then: result.then.bind(result),
  };
  return chain;
}

describe('IngestionService', () => {
  it('stages chunks before atomically activating the new ingestion', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const cleanup = deleteChain();
    const rpc = vi.fn().mockResolvedValue({ error: null });
    const client = {
      from: vi.fn(() => ({
        insert,
        delete: vi.fn(() => cleanup),
      })),
      rpc,
    };
    const provider = {
      id: 'openai-compatible',
      model: 'embedding-model',
      dimensions: 3,
      embed: vi.fn().mockResolvedValue([
        { text: 'first', vector: [1, 0, 0], index: 0 },
        { text: 'second', vector: [0, 1, 0], index: 1 },
      ]),
    };
    const service = new IngestionService(
      {
        getRegistryForUser: vi.fn().mockResolvedValue({ embedding: provider }),
      } as never,
      { getClient: vi.fn(() => client) } as never,
      {
        chunk: vi.fn(() => [
          { text: 'first', startOffset: 0, endOffset: 5 },
          { text: 'second', startOffset: 6, endOffset: 12 },
        ]),
      } as never,
    );

    await service.ingestDocument('document-id', 'user-id', 'content', 'token');

    expect(insert).toHaveBeenCalledOnce();
    expect(rpc).toHaveBeenCalledWith(
      'activate_document_ingestion',
      expect.objectContaining({
        p_document_id: 'document-id',
        p_user_id: 'user-id',
      }),
    );
    expect(insert.mock.invocationCallOrder[0]!).toBeLessThan(
      rpc.mock.invocationCallOrder[0]!,
    );
  });

  it('cleans only the staged ingestion when embedding fails', async () => {
    const cleanup = deleteChain();
    const rpc = vi.fn();
    const client = {
      from: vi.fn(() => ({
        insert: vi.fn(),
        delete: vi.fn(() => cleanup),
      })),
      rpc,
    };
    const service = new IngestionService(
      {
        getRegistryForUser: vi.fn().mockResolvedValue({
          embedding: {
            id: 'provider',
            model: 'model',
            dimensions: 3,
            embed: vi.fn().mockRejectedValue(new Error('provider unavailable')),
          },
        }),
      } as never,
      { getClient: vi.fn(() => client) } as never,
      {
        chunk: vi.fn(() => [
          { text: 'content', startOffset: 0, endOffset: 7 },
        ]),
      } as never,
    );

    await expect(
      service.ingestDocument('document-id', 'user-id', 'content', 'token'),
    ).rejects.toThrow('provider unavailable');

    expect(rpc).not.toHaveBeenCalled();
    expect(cleanup.eq).toHaveBeenCalledWith('document_id', 'document-id');
    expect(cleanup.eq).toHaveBeenCalledWith(
      'ingestion_id',
      expect.any(String),
    );
  });
});
