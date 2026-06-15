import OpenAI from 'openai';
import type { EmbeddingProvider } from '../ports/embedding.provider';
import type { EmbeddingResult } from '../types/embedding.types';
import type { EmbeddingProviderConfig } from '../types/config.types';
import { DimensionMismatchError, ProviderConfigError } from '../errors';

function supportsDimensionsParam(model: string): boolean {
  return /text-embedding-3/i.test(model);
}

export class OpenAICompatibleEmbeddingAdapter implements EmbeddingProvider {
  readonly id = 'openai-compatible';
  readonly model: string;
  readonly dimensions: number;
  private readonly client: OpenAI;

  constructor(private readonly config: EmbeddingProviderConfig) {
    this.model = config.model;
    this.dimensions = config.dimensions;
    this.client = new OpenAI({
      baseURL: config.baseUrl,
      apiKey: config.apiKey ?? 'not-needed',
    });
  }

  async embed(texts: string[]): Promise<EmbeddingResult[]> {
    if (texts.length === 0) return [];

    const request: OpenAI.Embeddings.EmbeddingCreateParams = {
      model: this.model,
      input: texts,
    };
    if (supportsDimensionsParam(this.model)) {
      request.dimensions = this.dimensions;
    }

    const response = await this.client.embeddings.create(request);

    if (!response.data?.length) {
      throw new ProviderConfigError(
        `Embedding API returned no vectors for model "${this.model}". Check your API key and model settings.`,
      );
    }

    return response.data.map((item, index) => {
      const vector = item.embedding;
      if (vector.length !== this.dimensions) {
        throw new DimensionMismatchError(this.dimensions, vector.length);
      }
      return {
        text: texts[index] ?? '',
        vector,
        index,
      };
    });
  }
}
