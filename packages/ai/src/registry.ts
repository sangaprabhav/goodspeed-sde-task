import type { ChatProvider } from './ports/chat.provider';
import type { EmbeddingProvider } from './ports/embedding.provider';
import type { AIEnvConfig, ChatProviderConfig, EmbeddingProviderConfig } from './types/config.types';
import { OpenAICompatibleChatAdapter } from './adapters/openai-compatible.chat';
import { OpenAICompatibleEmbeddingAdapter } from './adapters/openai-compatible.embedding';
import { OllamaChatAdapter } from './adapters/ollama.chat';
import { OllamaEmbeddingAdapter } from './adapters/ollama.embedding';
import { ProviderConfigError } from './errors';

export interface AIRegistry {
  chat: ChatProvider;
  embedding: EmbeddingProvider;
}

function resolveChatProvider(config: ChatProviderConfig): ChatProvider {
  switch (config.provider) {
    case 'openai-compatible':
      return new OpenAICompatibleChatAdapter(config);
    case 'ollama':
      return new OllamaChatAdapter(config);
    default:
      throw new ProviderConfigError(`Unknown chat provider: ${config.provider}`);
  }
}

function resolveEmbeddingProvider(config: EmbeddingProviderConfig): EmbeddingProvider {
  switch (config.provider) {
    case 'openai-compatible':
      return new OpenAICompatibleEmbeddingAdapter(config);
    case 'ollama':
      return new OllamaEmbeddingAdapter(config);
    default:
      throw new ProviderConfigError(`Unknown embedding provider: ${config.provider}`);
  }
}

export function createAIRegistry(config: AIEnvConfig): AIRegistry {
  const databaseVectorDimensions = config.databaseVectorDimensions ?? 1536;
  const embedding = resolveEmbeddingProvider(config.embedding);

  if (embedding.dimensions !== databaseVectorDimensions) {
    throw new ProviderConfigError(
      `Embedding dimensions (${embedding.dimensions}) must match the database vector dimension (${databaseVectorDimensions})`,
    );
  }

  return {
    chat: resolveChatProvider(config.chat),
    embedding,
  };
}
