import { Injectable } from '@nestjs/common';
import type { Citation } from '@repo/shared';
import {
  DEFAULT_TOP_K_CHUNKS,
  DEFAULT_SIMILARITY_THRESHOLD,
  conversationTitleFromMessage,
  isDefaultConversationTitle,
} from '@repo/shared';
import { UserAIService } from '../ai/user-ai.service';
import { SupabaseService } from '../supabase/supabase.service';

interface RetrievedChunk {
  id: string;
  document_id: string;
  content: string;
  chunk_index: number;
  document_title: string;
  similarity: number;
}

interface DocumentInventoryItem {
  id: string;
  title: string;
  tags: string[];
  updatedAt: string;
}

@Injectable()
export class ChatService {
  constructor(
    private readonly userAI: UserAIService,
    private readonly supabase: SupabaseService,
  ) {}

  async retrieveContext(
    userId: string,
    query: string,
    accessToken: string,
  ): Promise<{ chunks: RetrievedChunk[]; citations: Citation[] }> {
    const ai = await this.userAI.getRegistryForUser(userId, accessToken);
    const provider = ai.embedding;

    const [queryEmbedding] = await provider.embed([query]);
    if (!queryEmbedding) return { chunks: [], citations: [] };

    const client = this.supabase.getClient(accessToken);
    const topK = this.readPositiveInt(
      process.env.RAG_TOP_K,
      DEFAULT_TOP_K_CHUNKS,
    );
    const { data, error } = await client.rpc('match_document_chunks', {
      query_embedding: JSON.stringify(queryEmbedding.vector),
      match_count: topK,
      filter_user_id: userId,
      filter_embedding_model: provider.model,
      filter_embedding_dimensions: provider.dimensions,
    });

    if (error) throw new Error(`Vector search failed: ${error.message}`);

    const similarityThreshold = this.readThreshold(
      process.env.RAG_SIMILARITY_THRESHOLD,
      DEFAULT_SIMILARITY_THRESHOLD,
    );
    const chunks = ((data ?? []) as RetrievedChunk[]).filter(
      (chunk) => chunk.similarity >= similarityThreshold,
    );
    const citations: Citation[] = chunks.map((c) => ({
      documentId: c.document_id,
      chunkId: c.id,
      title: c.document_title,
      excerpt: c.content.slice(0, 200),
      score: c.similarity,
      chunkIndex: c.chunk_index,
    }));

    return { chunks, citations };
  }

  private readPositiveInt(value: string | undefined, fallback: number): number {
    const parsed = Number.parseInt(value ?? '', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  private readThreshold(value: string | undefined, fallback: number): number {
    const parsed = Number.parseFloat(value ?? '');
    return Number.isFinite(parsed) && parsed >= -1 && parsed <= 1
      ? parsed
      : fallback;
  }

  isDocumentInventoryQuery(query: string): boolean {
    const normalized = query
      .toLowerCase()
      .replace(/[^\w\s']/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return [
      /^(what|which) (documents|files) do i have$/,
      /^(list|show)( me)? (all )?my (documents|files)$/,
      /^how many (documents|files) do i have$/,
      /^(what|which) (documents|files) are in my knowledge base$/,
      /^(what|which) (other|all) (documents|files) do i have$/,
      /^do i have (any )?other (documents|files)$/,
      /^what('s| is) in my knowledge base$/,
    ].some((pattern) => pattern.test(normalized));
  }

  formatDocumentInventory(documents: DocumentInventoryItem[]): string {
    if (documents.length === 0) {
      return 'You do not have any documents in your knowledge base yet.';
    }

    const noun = documents.length === 1 ? 'document' : 'documents';
    const items = documents.map((document, index) => {
      const tags = document.tags.length
        ? ` - tags: ${document.tags.join(', ')}`
        : '';
      return `${index + 1}. **${this.escapeMarkdown(document.title)}**${tags}`;
    });

    return `You have **${documents.length} ${noun}** in your knowledge base:\n\n${items.join('\n')}`;
  }

  private escapeMarkdown(value: string): string {
    return value.replace(/([\\`*_{}[\]()#+\-.!|>])/g, '\\$1');
  }

  private async listDocumentInventory(
    userId: string,
    accessToken: string,
  ): Promise<DocumentInventoryItem[]> {
    const client = this.supabase.getClient(accessToken);
    const { data, error } = await client
      .from('documents')
      .select('id, title, tags, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) throw new Error(`Failed to list documents: ${error.message}`);

    return (data ?? []).map((document) => ({
      id: document.id as string,
      title: document.title as string,
      tags: (document.tags as string[]) ?? [],
      updatedAt: document.updated_at as string,
    }));
  }

  buildSystemPrompt(chunks: RetrievedChunk[]): string {
    const formatting = `Format every response in clean, well-edited Markdown:
- Use short paragraphs (2–4 sentences max per paragraph)
- Use bullet or numbered lists for steps, options, or multiple points
- Use **bold** for key terms and \`inline code\` for technical identifiers
- Use ## headings only when the answer has clear sections
- Do not wrap the entire reply in a single code block
- Write like a polished editor: clear, direct, and easy to scan`;

    if (chunks.length === 0) {
      return `You are a helpful assistant. The user has no indexed documents yet, or none matched their question.
Let them know politely and suggest they add documents to their knowledge base.

${formatting}`;
    }

    const context = chunks
      .map(
        (c, i) =>
          `[${i + 1}] Document "${c.document_title}":\n${c.content}`,
      )
      .join('\n\n');

    return `You answer questions using ONLY the provided context from the user's knowledge base.
If the answer is not in the context, say so clearly — do not make up information.
Always be concise and helpful.

${formatting}

Context:
${context}`;
  }

  async *streamChat(
    userId: string,
    conversationId: string,
    userMessage: string,
    accessToken: string,
  ): AsyncGenerator<{ event: string; data: unknown }> {
    const client = this.supabase.getClient(accessToken);

    const { data: history } = await client
      .from('messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(20);

    const isFirstMessage = !history?.length;
    let conversationTitle: string | undefined;

    if (isFirstMessage) {
      const { data: conv } = await client
        .from('conversations')
        .select('title')
        .eq('id', conversationId)
        .single();

      if (isDefaultConversationTitle(conv?.title as string | undefined)) {
        conversationTitle = conversationTitleFromMessage(userMessage);
      }
    }

    await client.from('messages').insert({
      conversation_id: conversationId,
      user_id: userId,
      role: 'user',
      content: userMessage,
    });

    if (this.isDocumentInventoryQuery(userMessage)) {
      const documents = await this.listDocumentInventory(userId, accessToken);
      const fullContent = this.formatDocumentInventory(documents);
      yield { event: 'token', data: { text: fullContent } };

      const { data: assistantMsg } = await client
        .from('messages')
        .insert({
          conversation_id: conversationId,
          user_id: userId,
          role: 'assistant',
          content: fullContent,
          citations: [],
          token_usage: {
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0,
          },
        })
        .select()
        .single();

      await client
        .from('conversations')
        .update({
          updated_at: new Date().toISOString(),
          ...(conversationTitle ? { title: conversationTitle } : {}),
        })
        .eq('id', conversationId);

      yield {
        event: 'done',
        data: {
          messageId: assistantMsg?.id,
          usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
          citations: [],
        },
      };
      return;
    }

    const ai = await this.userAI.getRegistryForUser(userId, accessToken);
    const aiConfig = await this.userAI.getUserAIConfig(userId, accessToken);
    const { chunks, citations } = await this.retrieveContext(
      userId,
      userMessage,
      accessToken,
    );

    for (const citation of citations) {
      yield { event: 'citation', data: citation };
    }

    const messages = [
      { role: 'system' as const, content: this.buildSystemPrompt(chunks) },
      ...(history ?? []).map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user' as const, content: userMessage },
    ];

    let fullContent = '';
    let usage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

    for await (const token of ai.chat.complete({ messages })) {
      if (token.type === 'content' && token.text) {
        fullContent += token.text;
        yield { event: 'token', data: { text: token.text } };
      }
      if (token.type === 'done' && token.usage) {
        usage = {
          promptTokens: token.usage.promptTokens,
          completionTokens: token.usage.completionTokens,
          totalTokens: token.usage.totalTokens,
        };
      }
    }

    const { data: assistantMsg } = await client
      .from('messages')
      .insert({
        conversation_id: conversationId,
        user_id: userId,
        role: 'assistant',
        content: fullContent,
        citations,
        token_usage: usage,
      })
      .select()
      .single();

    await client.from('usage_events').insert({
      user_id: userId,
      operation: 'chat',
      model: aiConfig.chat.model,
      prompt_tokens: usage.promptTokens,
      completion_tokens: usage.completionTokens,
    });

    await client
      .from('conversations')
      .update({
        updated_at: new Date().toISOString(),
        ...(conversationTitle ? { title: conversationTitle } : {}),
      })
      .eq('id', conversationId);

    yield {
      event: 'done',
      data: { messageId: assistantMsg?.id, usage, citations },
    };
  }
}
