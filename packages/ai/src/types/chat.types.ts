export type ChatRole = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface ChatToken {
  type: 'content' | 'done';
  text?: string;
  usage?: TokenUsage;
}

export interface ChatCompletion {
  content: string;
  usage?: TokenUsage;
}
