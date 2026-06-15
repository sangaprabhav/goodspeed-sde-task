import { describe, expect, it } from 'vitest';
import { ChatService } from './chat.service';

describe('ChatService prompt construction', () => {
  const service = new ChatService({} as never, {} as never);

  it('grounds answers in supplied document context', () => {
    const prompt = service.buildSystemPrompt([
      {
        id: 'chunk-id',
        document_id: 'document-id',
        document_title: 'Architecture Notes',
        chunk_index: 0,
        content: 'The API uses NestJS.',
        similarity: 0.9,
      },
    ]);

    expect(prompt).toContain('ONLY the provided context');
    expect(prompt).toContain('Architecture Notes');
    expect(prompt).toContain('The API uses NestJS.');
  });

  it('handles an empty corpus without inviting hallucination', () => {
    expect(service.buildSystemPrompt([])).toContain('no indexed documents');
  });

  it('recognizes document inventory questions', () => {
    expect(service.isDocumentInventoryQuery('What documents do I have?')).toBe(
      true,
    );
    expect(service.isDocumentInventoryQuery('List my files')).toBe(true);
    expect(
      service.isDocumentInventoryQuery('Show me all my documents'),
    ).toBe(true);
    expect(service.isDocumentInventoryQuery('Do I have other files?')).toBe(
      true,
    );
    expect(
      service.isDocumentInventoryQuery('Which documents mention NestJS?'),
    ).toBe(false);
  });

  it('formats the complete document inventory deterministically', () => {
    const result = service.formatDocumentInventory([
      {
        id: 'one',
        title: 'AI FDE Resume',
        tags: ['resume'],
        updatedAt: '2026-06-13T00:00:00.000Z',
      },
      {
        id: 'two',
        title: 'Technical Task',
        tags: [],
        updatedAt: '2026-06-12T00:00:00.000Z',
      },
    ]);

    expect(result).toContain('2 documents');
    expect(result).toContain('AI FDE Resume');
    expect(result).toContain('Technical Task');
    expect(result).toContain('tags: resume');
  });
});
