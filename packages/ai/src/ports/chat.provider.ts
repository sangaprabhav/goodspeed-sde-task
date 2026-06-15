import type { ChatRequest, ChatToken, ChatCompletion } from '../types/chat.types';

export interface ChatProvider {
  readonly id: string;
  complete(req: ChatRequest): AsyncIterable<ChatToken>;
  completeSync?(req: ChatRequest): Promise<ChatCompletion>;
}
