import { Injectable } from '@nestjs/common';
import {
  DEFAULT_CHUNK_SIZE,
  DEFAULT_CHUNK_OVERLAP,
  type TextChunk,
} from '@repo/shared';

@Injectable()
export class ChunkerService {
  chunk(text: string): TextChunk[] {
    if (!text.trim()) return [];

    const separators = ['\n\n', '\n', '. ', ' '];
    const chunkSize = this.readPositiveInt(
      process.env.RAG_CHUNK_SIZE,
      DEFAULT_CHUNK_SIZE,
    );
    const configuredOverlap = this.readPositiveInt(
      process.env.RAG_CHUNK_OVERLAP,
      DEFAULT_CHUNK_OVERLAP,
    );
    const overlap = Math.min(configuredOverlap, chunkSize - 1);

    return this.recursiveSplit(text, separators, chunkSize, overlap);
  }

  private readPositiveInt(value: string | undefined, fallback: number): number {
    const parsed = Number.parseInt(value ?? '', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  private recursiveSplit(
    text: string,
    separators: string[],
    chunkSize: number,
    overlap: number,
  ): TextChunk[] {
    const chunks: TextChunk[] = [];
    let start = 0;

    while (start < text.length) {
      let end = Math.min(start + chunkSize, text.length);

      if (end < text.length) {
        let bestBreak = -1;
        for (const sep of separators) {
          const idx = text.lastIndexOf(sep, end);
          if (idx > start + chunkSize * 0.5) {
            bestBreak = idx + sep.length;
            break;
          }
        }
        if (bestBreak > start) end = bestBreak;
      }

      const raw = text.slice(start, end);
      const trimmed = raw.trim();
      if (trimmed) {
        const trimStart = raw.indexOf(trimmed);
        chunks.push({
          text: trimmed,
          startOffset: start + trimStart,
          endOffset: start + trimStart + trimmed.length,
        });
      }

      if (end >= text.length) break;
      start = Math.max(start + 1, end - overlap);
    }

    return chunks;
  }
}
