import type { ChatProvider } from '../ports/chat.provider';
import type { ChatRequest, ChatToken, ChatCompletion } from '../types/chat.types';
import type { ChatProviderConfig } from '../types/config.types';

export class OllamaChatAdapter implements ChatProvider {
  readonly id = 'ollama';
  private readonly baseUrl: string;

  constructor(private readonly config: ChatProviderConfig) {
    this.baseUrl = config.baseUrl.replace(/\/v1\/?$/, '');
  }

  async *complete(req: ChatRequest): AsyncIterable<ChatToken> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.config.model,
        messages: req.messages,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama chat failed: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const json = JSON.parse(line) as {
            message?: { content?: string };
            done?: boolean;
          };
          if (json.message?.content) {
            yield { type: 'content', text: json.message.content };
          }
        } catch {
          // skip malformed lines
        }
      }
    }

    yield { type: 'done' };
  }

  async completeSync(req: ChatRequest): Promise<ChatCompletion> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.config.model,
        messages: req.messages,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama chat failed: ${response.statusText}`);
    }

    const json = (await response.json()) as { message?: { content?: string } };
    return { content: json.message?.content ?? '' };
  }
}
