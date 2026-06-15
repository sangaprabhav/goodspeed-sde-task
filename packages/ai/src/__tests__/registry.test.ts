import { describe, it, expect } from 'vitest';
import { createAIRegistry, loadAIConfigFromEnv } from '../index';
import { ProviderConfigError } from '../errors';

describe('createAIRegistry', () => {
  it('resolves openai-compatible providers from env', () => {
    const config = loadAIConfigFromEnv({
      AI_CHAT_PROVIDER: 'openai-compatible',
      AI_CHAT_BASE_URL: 'https://api.openai.com/v1',
      AI_CHAT_API_KEY: 'test-key',
      AI_CHAT_MODEL: 'gpt-4o-mini',
      AI_EMBEDDING_PROVIDER: 'openai-compatible',
      AI_EMBEDDING_BASE_URL: 'https://api.openai.com/v1',
      AI_EMBEDDING_API_KEY: 'test-key',
      AI_EMBEDDING_MODEL: 'text-embedding-3-small',
      AI_EMBEDDING_DIMENSIONS: '1536',
      DB_VECTOR_DIMENSIONS: '1536',
    });

    const registry = createAIRegistry(config);
    expect(registry.chat.id).toBe('openai-compatible');
    expect(registry.embedding.id).toBe('openai-compatible');
    expect(registry.embedding.dimensions).toBe(1536);
    expect(registry.embedding.model).toBe('text-embedding-3-small');
  });

  it('resolves Ollama chat with a database-compatible embedding model', () => {
    const registry = createAIRegistry({
      chat: {
        provider: 'ollama',
        baseUrl: 'http://localhost:11434',
        model: 'llama3.2',
      },
      embedding: {
        provider: 'openai-compatible',
        baseUrl: 'https://api.openai.com/v1',
        model: 'text-embedding-3-small',
        dimensions: 1536,
      },
      databaseVectorDimensions: 1536,
    });

    expect(registry.chat.id).toBe('ollama');
    expect(registry.embedding.dimensions).toBe(1536);
  });

  it('throws when embedding dimensions differ from the database vector size', () => {
    expect(() =>
      createAIRegistry({
        chat: {
          provider: 'openai-compatible',
          baseUrl: 'https://api.openai.com/v1',
          model: 'gpt-4o-mini',
        },
        embedding: {
          provider: 'openai-compatible',
          baseUrl: 'https://api.openai.com/v1',
          model: 'text-embedding-3-large',
          dimensions: 3072,
        },
        databaseVectorDimensions: 1536,
      }),
    ).toThrow(ProviderConfigError);

    expect(() =>
      createAIRegistry({
        chat: {
          provider: 'ollama',
          baseUrl: 'http://localhost:11434',
          model: 'llama3.2',
        },
        embedding: {
          provider: 'ollama',
          baseUrl: 'http://localhost:11434',
          model: 'nomic-embed-text',
          dimensions: 768,
        },
        databaseVectorDimensions: 1536,
      }),
    ).toThrow(ProviderConfigError);
  });

  it('resolves OpenRouter from OPENROUTER_API_KEY only', () => {
    const config = loadAIConfigFromEnv({
      OPENROUTER_API_KEY: 'sk-or-test',
      AI_CHAT_BASE_URL: 'https://openrouter.ai/api/v1',
      AI_EMBEDDING_BASE_URL: 'https://openrouter.ai/api/v1',
      AI_EMBEDDING_DIMENSIONS: '1536',
      DB_VECTOR_DIMENSIONS: '1536',
    });

    expect(config.chat.apiKey).toBe('sk-or-test');
    expect(config.embedding.apiKey).toBe('sk-or-test');
    expect(config.chat.model).toBe('openai/gpt-4o-mini');
    expect(config.embedding.model).toBe('openai/text-embedding-3-small');

    const registry = createAIRegistry(config);
    expect(registry.embedding.model).toBe('openai/text-embedding-3-small');
  });
});

describe('loadAIConfigFromEnv', () => {
  it('uses defaults when env vars are missing', () => {
    const config = loadAIConfigFromEnv({});
    expect(config.chat.model).toBe('gpt-4o-mini');
    expect(config.embedding.model).toBe('text-embedding-3-small');
    expect(config.embedding.dimensions).toBe(1536);
  });
});
