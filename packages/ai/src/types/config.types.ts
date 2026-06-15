export type ProviderKind = 'openai-compatible' | 'ollama';

export interface ChatProviderConfig {
  provider: ProviderKind;
  baseUrl: string;
  apiKey?: string;
  model: string;
}

export interface EmbeddingProviderConfig {
  provider: ProviderKind;
  baseUrl: string;
  apiKey?: string;
  model: string;
  dimensions: number;
}

export interface AIEnvConfig {
  chat: ChatProviderConfig;
  embedding: EmbeddingProviderConfig;
  databaseVectorDimensions?: number;
}

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

function resolveApiKey(
  specific: string | undefined,
  openRouterKey: string | undefined,
  chatKey: string | undefined,
): string | undefined {
  return specific || openRouterKey || chatKey;
}

export function loadAIConfigFromEnv(env: Record<string, string | undefined> = process.env as Record<string, string | undefined>): AIEnvConfig {
  const openRouterKey = env.OPENROUTER_API_KEY;
  const chatApiKey = resolveApiKey(env.AI_CHAT_API_KEY, openRouterKey, undefined);
  const embeddingApiKey = resolveApiKey(
    env.AI_EMBEDDING_API_KEY,
    openRouterKey,
    chatApiKey,
  );

  const usingOpenRouter =
    !!openRouterKey ||
    env.AI_CHAT_BASE_URL?.includes('openrouter') ||
    env.AI_EMBEDDING_BASE_URL?.includes('openrouter');

  const defaultChatBaseUrl = usingOpenRouter ? OPENROUTER_BASE_URL : 'https://api.openai.com/v1';
  const defaultChatModel = usingOpenRouter ? 'openai/gpt-4o-mini' : 'gpt-4o-mini';
  const defaultEmbeddingModel = usingOpenRouter
    ? 'openai/text-embedding-3-small'
    : 'text-embedding-3-small';

  const embeddingDimensions = parseInt(
    env.AI_EMBEDDING_DIMENSIONS ?? '1536',
    10,
  );

  return {
    chat: {
      provider: (env.AI_CHAT_PROVIDER as ProviderKind) ?? 'openai-compatible',
      baseUrl: env.AI_CHAT_BASE_URL ?? defaultChatBaseUrl,
      apiKey: chatApiKey,
      model: env.AI_CHAT_MODEL ?? defaultChatModel,
    },
    embedding: {
      provider: (env.AI_EMBEDDING_PROVIDER as ProviderKind) ?? 'openai-compatible',
      baseUrl: env.AI_EMBEDDING_BASE_URL ?? defaultChatBaseUrl,
      apiKey: embeddingApiKey,
      model: env.AI_EMBEDDING_MODEL ?? defaultEmbeddingModel,
      dimensions: embeddingDimensions,
    },
    databaseVectorDimensions: parseInt(
      env.DB_VECTOR_DIMENSIONS ?? env.MAX_VECTOR_DIM ?? '1536',
      10,
    ),
  };
}
