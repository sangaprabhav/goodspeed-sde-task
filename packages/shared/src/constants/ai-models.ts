export interface ModelOption {
  id: string;
  label: string;
  dimensions?: number;
}

/** OpenRouter chat models supported by this app */
export const CHAT_MODEL_OPTIONS: ModelOption[] = [
  { id: 'openai/gpt-4o-mini', label: 'GPT-4o Mini' },
  { id: 'openai/gpt-4o', label: 'GPT-4o' },
  { id: 'anthropic/claude-3.5-haiku', label: 'Claude 3.5 Haiku' },
  { id: 'google/gemini-2.0-flash-001', label: 'Gemini 2.0 Flash' },
];

/** Embedding models pinned to 1536d (matches pgvector column) */
export const EMBEDDING_MODEL_OPTIONS: ModelOption[] = [
  { id: 'openai/text-embedding-3-small', label: 'Text Embedding 3 Small', dimensions: 1536 },
  { id: 'openai/text-embedding-3-large', label: 'Text Embedding 3 Large (1536d)', dimensions: 1536 },
  { id: 'openai/text-embedding-ada-002', label: 'Ada 002', dimensions: 1536 },
];

export const DEFAULT_CHAT_MODEL = 'openai/gpt-4o-mini';
export const DEFAULT_EMBEDDING_MODEL = 'openai/text-embedding-3-small';
export const DEFAULT_EMBEDDING_DIMENSIONS = 1536;

export function isValidChatModel(model: string): boolean {
  return CHAT_MODEL_OPTIONS.some((m) => m.id === model);
}

export function isValidEmbeddingModel(model: string): boolean {
  return EMBEDDING_MODEL_OPTIONS.some((m) => m.id === model);
}

export function embeddingDimensionsForModel(model: string): number {
  return EMBEDDING_MODEL_OPTIONS.find((m) => m.id === model)?.dimensions ?? DEFAULT_EMBEDDING_DIMENSIONS;
}

/** Only text-embedding-3-* models accept the OpenAI `dimensions` parameter */
export function embeddingSupportsDimensions(model: string): boolean {
  return /text-embedding-3/i.test(model);
}
