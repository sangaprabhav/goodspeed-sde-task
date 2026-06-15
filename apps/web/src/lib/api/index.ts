import { apiFetch, getAccessToken, ApiError } from './client';
import type { Citation } from '@repo/shared';

export { ApiError };

function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return 'Something went wrong';
}

export { toErrorMessage };

export interface Document {
  id: string;
  userId: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  ingestion?: { chunkCount: number; embeddingModel: string };
}

export const documentsApi = {
  list: () => apiFetch<Document[]>('/documents'),
  get: (id: string) => apiFetch<Document>(`/documents/${id}`),
  create: (data: { title: string; content?: string; tags?: string[] }) =>
    apiFetch<Document>('/documents', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<{ title: string; content: string; tags: string[] }>) =>
    apiFetch<Document>(`/documents/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (id: string) => apiFetch<{ success: boolean }>(`/documents/${id}`, { method: 'DELETE' }),
  getChunk: (id: string, chunkIndex: number) =>
    apiFetch<{
      chunkIndex: number;
      content: string;
      startOffset: number | null;
      endOffset: number | null;
    }>(`/documents/${id}/chunks/${chunkIndex}`),
  upload: async (file: File) => {
    const token = await getAccessToken();
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/api/v1/documents/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new ApiError(body.code ?? 'ERROR', body.message ?? res.statusText);
    }
    return res.json() as Promise<Document>;
  },
  uploadMany: async (
    files: File[],
    onProgress?: (completed: number, total: number) => void,
  ) => {
    const results: Document[] = [];
    const errors: { filename: string; message: string }[] = [];
    for (let i = 0; i < files.length; i++) {
      try {
        const doc = await documentsApi.upload(files[i]!);
        results.push(doc);
      } catch (err) {
        errors.push({ filename: files[i]!.name, message: toErrorMessage(err) });
      }
      onProgress?.(i + 1, files.length);
    }
    return { results, errors };
  },
  reindex: () =>
    apiFetch<{ documentsProcessed: number; totalChunks: number }>('/documents/reindex', {
      method: 'POST',
    }),
};

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: string;
  content: string;
  citations: Citation[];
  tokenUsage?: { promptTokens: number; completionTokens: number; totalTokens: number };
  createdAt: string;
}

export const conversationsApi = {
  list: () => apiFetch<Conversation[]>('/conversations'),
  create: (title?: string) =>
    apiFetch<Conversation>('/conversations', {
      method: 'POST',
      body: JSON.stringify({ title }),
    }),
  getMessages: (id: string) => apiFetch<Message[]>(`/conversations/${id}/messages`),
  remove: (id: string) =>
    apiFetch<{ success: boolean }>(`/conversations/${id}`, { method: 'DELETE' }),
};

export interface StreamCallbacks {
  onToken: (text: string) => void;
  onCitation: (citation: Citation) => void;
  onDone: (data: { messageId?: string; usage?: Record<string, number> }) => void;
  onError: (error: { code: string; message: string }) => void;
}

export async function streamChat(
  conversationId: string,
  content: string,
  callbacks: StreamCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  try {
    const { createClient } = await import('../supabase/client');
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
      callbacks.onError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
      return;
    }

    const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
    const res = await fetch(`${API_URL}/api/v1/chat/${conversationId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ content }),
      signal,
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      callbacks.onError({ code: body.code ?? 'ERROR', message: body.message ?? res.statusText });
      return;
    }

    const reader = res.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n\n');
      buffer = parts.pop() ?? '';

      for (const part of parts) {
        const lines = part.split('\n');
        let sseEvent = 'message';
        let dataLine = '';

        for (const line of lines) {
          if (line.startsWith('event: ')) sseEvent = line.slice(7);
          if (line.startsWith('data: ')) dataLine = line.slice(6);
        }

        if (!dataLine) continue;

        try {
          const parsed = JSON.parse(dataLine);
          switch (sseEvent) {
            case 'token':
              callbacks.onToken(parsed.text);
              break;
            case 'citation':
              callbacks.onCitation(parsed);
              break;
            case 'done':
              callbacks.onDone(parsed);
              break;
            case 'error':
              callbacks.onError(parsed);
              break;
          }
        } catch {
          // skip malformed
        }
      }
    }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') return;
    callbacks.onError({
      code: 'PROVIDER_ERROR',
      message: err instanceof Error ? err.message : 'Chat stream failed',
    });
  }
}

export const usageApi = {
  summary: () =>
    apiFetch<{
      totalPromptTokens: number;
      totalCompletionTokens: number;
      totalTokens: number;
      byModel: Record<string, { promptTokens: number; completionTokens: number }>;
      byDay: Array<{ date: string; tokens: number }>;
    }>('/usage/summary'),
};

export interface ModelOption {
  id: string;
  label: string;
  dimensions?: number;
}

export interface AISettings {
  chatModel: string;
  embeddingModel: string;
  embeddingDimensions: number;
  needsReindex: boolean;
  chatModels: ModelOption[];
  embeddingModels: ModelOption[];
}

export const settingsApi = {
  getAI: () => apiFetch<AISettings>('/settings/ai'),
  updateAI: (data: { chatModel?: string; embeddingModel?: string }) =>
    apiFetch<AISettings>('/settings/ai', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
};
