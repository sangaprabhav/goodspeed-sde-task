import { Injectable } from '@nestjs/common';
import {
  createConversationSchema,
  conversationTitleFromMessage,
  DEFAULT_CONVERSATION_TITLE,
  isDefaultConversationTitle,
} from '@repo/shared';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class ConversationsService {
  constructor(private readonly supabase: SupabaseService) {}

  async list(userId: string, accessToken: string) {
    const client = this.supabase.getClient(accessToken);
    const { data, error } = await client
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) throw new Error(error.message);

    const conversations = (data ?? []).map(this.mapConversation);
    return this.enrichDefaultTitles(client, conversations);
  }

  async get(userId: string, id: string, accessToken: string) {
    const client = this.supabase.getClient(accessToken);
    const { data, error } = await client
      .from('conversations')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !data) return null;
    return this.mapConversation(data);
  }

  async create(userId: string, body: unknown, accessToken: string) {
    const input = createConversationSchema.parse(body ?? {});
    const client = this.supabase.getClient(accessToken);
    const { data, error } = await client
      .from('conversations')
      .insert({
        user_id: userId,
        title: input.title ?? DEFAULT_CONVERSATION_TITLE,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return this.mapConversation(data);
  }

  async getMessages(userId: string, conversationId: string, accessToken: string) {
    const client = this.supabase.getClient(accessToken);
    const { data, error } = await client
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) throw new Error(error.message);
    return (data ?? []).map(this.mapMessage);
  }

  async remove(userId: string, id: string, accessToken: string) {
    const client = this.supabase.getClient(accessToken);
    const { error } = await client
      .from('conversations')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw new Error(error.message);
  }

  private async enrichDefaultTitles(
    client: ReturnType<SupabaseService['getClient']>,
    conversations: ReturnType<typeof this.mapConversation>[],
  ) {
    const untitledIds = conversations
      .filter((c) => isDefaultConversationTitle(c.title))
      .map((c) => c.id);

    if (!untitledIds.length) return conversations;

    const { data: messages, error } = await client
      .from('messages')
      .select('conversation_id, content, created_at')
      .in('conversation_id', untitledIds)
      .eq('role', 'user')
      .order('created_at', { ascending: true });

    if (error || !messages?.length) return conversations;

    const firstMessageByConversation = new Map<string, string>();
    for (const message of messages) {
      const conversationId = message.conversation_id as string;
      if (!firstMessageByConversation.has(conversationId)) {
        firstMessageByConversation.set(conversationId, message.content as string);
      }
    }

    const backfills: { id: string; title: string }[] = [];

    const enriched = conversations.map((conversation) => {
      const firstMessage = firstMessageByConversation.get(conversation.id);
      if (!firstMessage) return conversation;

      const title = conversationTitleFromMessage(firstMessage);
      backfills.push({ id: conversation.id, title });
      return { ...conversation, title };
    });

    if (backfills.length) {
      await Promise.allSettled(
        backfills.map(({ id, title }) =>
          client.from('conversations').update({ title }).eq('id', id),
        ),
      );
    }

    return enriched;
  }

  private mapConversation(row: Record<string, unknown>) {
    return {
      id: row.id as string,
      userId: row.user_id as string,
      title: row.title as string,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }

  private mapMessage(row: Record<string, unknown>) {
    return {
      id: row.id as string,
      conversationId: row.conversation_id as string,
      userId: row.user_id as string,
      role: row.role as string,
      content: row.content as string,
      citations: (row.citations as unknown[]) ?? [],
      tokenUsage: row.token_usage as Record<string, number> | undefined,
      createdAt: row.created_at as string,
    };
  }
}
