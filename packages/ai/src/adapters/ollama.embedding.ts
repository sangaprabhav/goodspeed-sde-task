import type { EmbeddingProvider } from '../ports/embedding.provider';
import type { EmbeddingResult } from '../types/embedding.types';
import type { EmbeddingProviderConfig } from '../types/config.types';
import { DimensionMismatchError } from '../errors';

export class OllamaEmbeddingAdapter implements EmbeddingProvider {
  readonly id = 'ollama';
  readonly model: string;
  readonly dimensions: number;
  private readonly baseUrl: string;

  constructor(private readonly config: EmbeddingProviderConfig) {
    this.model = config.model;
    this.dimensions = config.dimensions;
    this.baseUrl = config.baseUrl.replace(/\/v1\/?$/, '');
  }

  async embed(texts: string[]): Promise<EmbeddingResult[]> {
    const results: EmbeddingResult[] = [];

    for (let index = 0; index < texts.length; index++) {
      const text = texts[index]!;
      const response = await fetch(`${this.baseUrl}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: this.model, prompt: text }),
      });

      if (!response.ok) {
        throw new Error(`Ollama embedding failed: ${response.statusText}`);
      }

      const json = (await response.json()) as { embedding: number[] };
      if (json.embedding.length !== this.dimensions) {
        throw new DimensionMismatchError(this.dimensions, json.embedding.length);
      }

      results.push({ text, vector: json.embedding, index });
    }

    return results;
  }
}
