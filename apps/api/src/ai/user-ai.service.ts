import { Injectable } from '@nestjs/common';
import {
  createAIRegistry,
  loadAIConfigFromEnv,
  type AIEnvConfig,
  type AIRegistry,
} from '@repo/ai';
import {
  CHAT_MODEL_OPTIONS,
  DEFAULT_CHAT_MODEL,
  DEFAULT_EMBEDDING_MODEL,
  EMBEDDING_MODEL_OPTIONS,
  embeddingDimensionsForModel,
} from '@repo/shared';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class UserAIService {
  private readonly baseConfig = loadAIConfigFromEnv();

  constructor(private readonly supabase: SupabaseService) {}

  getAvailableModels() {
    return {
      chatModels: CHAT_MODEL_OPTIONS,
      embeddingModels: EMBEDDING_MODEL_OPTIONS,
    };
  }

  async getUserAIConfig(userId: string, accessToken: string): Promise<AIEnvConfig> {
    const client = this.supabase.getClient(accessToken);
    const { data } = await client
      .from('corpus_config')
      .select('chat_model, embedding_model, embedding_dimensions')
      .eq('user_id', userId)
      .single();

    const chatModel = this.isOpenRouter(this.baseConfig.chat.baseUrl)
      ? (data?.chat_model as string | undefined) ?? DEFAULT_CHAT_MODEL
      : this.baseConfig.chat.model;
    const embeddingModel = this.isOpenRouter(this.baseConfig.embedding.baseUrl)
      ? (data?.embedding_model as string | undefined) ?? DEFAULT_EMBEDDING_MODEL
      : this.baseConfig.embedding.model;
    const embeddingDimensions =
      embeddingModel === this.baseConfig.embedding.model
        ? this.baseConfig.embedding.dimensions
        : (data?.embedding_dimensions as number | undefined) ??
          embeddingDimensionsForModel(embeddingModel);

    return {
      ...this.baseConfig,
      chat: {
        ...this.baseConfig.chat,
        model: chatModel,
      },
      embedding: {
        ...this.baseConfig.embedding,
        model: embeddingModel,
        dimensions: embeddingDimensions,
      },
    };
  }

  async getRegistryForUser(userId: string, accessToken: string): Promise<AIRegistry> {
    const config = await this.getUserAIConfig(userId, accessToken);
    return createAIRegistry(config);
  }

  async getSettings(userId: string, accessToken: string) {
    const client = this.supabase.getClient(accessToken);
    const { data: corpus } = await client
      .from('corpus_config')
      .select('chat_model, embedding_model, embedding_dimensions')
      .eq('user_id', userId)
      .single();

    const openRouterChat = this.isOpenRouter(this.baseConfig.chat.baseUrl);
    const openRouterEmbedding = this.isOpenRouter(
      this.baseConfig.embedding.baseUrl,
    );
    const chatModel = openRouterChat
      ? (corpus?.chat_model as string | undefined) ?? DEFAULT_CHAT_MODEL
      : this.baseConfig.chat.model;
    const embeddingModel = openRouterEmbedding
      ? (corpus?.embedding_model as string | undefined) ?? DEFAULT_EMBEDDING_MODEL
      : this.baseConfig.embedding.model;

    const { count: staleChunks } = await client
      .from('document_chunks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .neq('embedding_model', embeddingModel);

    return {
      chatModel,
      embeddingModel,
      embeddingDimensions:
        embeddingModel === this.baseConfig.embedding.model
          ? this.baseConfig.embedding.dimensions
          : (corpus?.embedding_dimensions as number | undefined) ??
            embeddingDimensionsForModel(embeddingModel),
      needsReindex: (staleChunks ?? 0) > 0,
      chatModels: openRouterChat
        ? CHAT_MODEL_OPTIONS
        : [{ id: chatModel, label: chatModel }],
      embeddingModels: openRouterEmbedding
        ? EMBEDDING_MODEL_OPTIONS
        : [
            {
              id: embeddingModel,
              label: embeddingModel,
              dimensions: this.baseConfig.embedding.dimensions,
            },
          ],
    };
  }

  async updateSettings(
    userId: string,
    input: { chatModel?: string; embeddingModel?: string },
    accessToken: string,
  ) {
    const client = this.supabase.getClient(accessToken);
    const { data: existing } = await client
      .from('corpus_config')
      .select('chat_model, embedding_model, embedding_dimensions, embedding_provider_id')
      .eq('user_id', userId)
      .single();

    const chatModel = input.chatModel ?? (existing?.chat_model as string) ?? DEFAULT_CHAT_MODEL;
    const embeddingModel =
      input.embeddingModel ?? (existing?.embedding_model as string) ?? DEFAULT_EMBEDDING_MODEL;
    const embeddingDimensions = embeddingDimensionsForModel(embeddingModel);

    const { error } = await client.from('corpus_config').upsert({
      user_id: userId,
      chat_model: chatModel,
      embedding_model: embeddingModel,
      embedding_dimensions: embeddingDimensions,
      embedding_provider_id:
        (existing?.embedding_provider_id as string | undefined) ?? 'openai-compatible',
      updated_at: new Date().toISOString(),
    });

    if (error) throw new Error(error.message);

    return this.getSettings(userId, accessToken);
  }

  private isOpenRouter(baseUrl: string): boolean {
    return baseUrl.toLowerCase().includes('openrouter');
  }
}
