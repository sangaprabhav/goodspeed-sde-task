import { afterEach, describe, expect, it } from 'vitest';
import { ChunkerService } from './chunker.service';

describe('ChunkerService', () => {
  const originalSize = process.env.RAG_CHUNK_SIZE;
  const originalOverlap = process.env.RAG_CHUNK_OVERLAP;

  afterEach(() => {
    process.env.RAG_CHUNK_SIZE = originalSize;
    process.env.RAG_CHUNK_OVERLAP = originalOverlap;
  });

  it('returns stable source offsets and overlapping chunks', () => {
    process.env.RAG_CHUNK_SIZE = '20';
    process.env.RAG_CHUNK_OVERLAP = '5';
    const text = 'First paragraph.\n\nSecond paragraph with more detail.';

    const chunks = new ChunkerService().chunk(text);

    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(text.slice(chunk.startOffset, chunk.endOffset)).toBe(chunk.text);
    }
    expect(chunks[1]!.startOffset).toBeLessThan(chunks[0]!.endOffset);
  });

  it('returns no chunks for blank content', () => {
    expect(new ChunkerService().chunk(' \n ')).toEqual([]);
  });
});
