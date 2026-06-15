export interface Citation {
  documentId: string;
  chunkId: string;
  title: string;
  excerpt: string;
  score: number;
  chunkIndex: number;
}

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
  userId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  citations: Citation[];
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  createdAt: string;
}

export interface UsageSummary {
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalTokens: number;
  byModel: Record<string, { promptTokens: number; completionTokens: number }>;
  byDay: Array<{ date: string; tokens: number }>;
}
