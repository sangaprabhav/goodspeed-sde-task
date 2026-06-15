import OpenAI from 'openai';
import type { ChatProvider } from '../ports/chat.provider';
import type { ChatRequest, ChatToken, ChatCompletion } from '../types/chat.types';
import type { ChatProviderConfig } from '../types/config.types';

export class OpenAICompatibleChatAdapter implements ChatProvider {
  readonly id = 'openai-compatible';
  private readonly client: OpenAI;

  constructor(private readonly config: ChatProviderConfig) {
    this.client = new OpenAI({
      baseURL: config.baseUrl,
      apiKey: config.apiKey ?? 'not-needed',
    });
  }

  async *complete(req: ChatRequest): AsyncIterable<ChatToken> {
    const stream = await this.client.chat.completions.create({
      model: this.config.model,
      messages: req.messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: req.temperature ?? 0.7,
      max_tokens: req.maxTokens,
      stream: true,
      stream_options: { include_usage: true },
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        yield { type: 'content', text: delta };
      }
      if (chunk.usage) {
        yield {
          type: 'done',
          usage: {
            promptTokens: chunk.usage.prompt_tokens,
            completionTokens: chunk.usage.completion_tokens,
            totalTokens: chunk.usage.total_tokens,
          },
        };
      }
    }

    yield { type: 'done' };
  }

  async completeSync(req: ChatRequest): Promise<ChatCompletion> {
    const response = await this.client.chat.completions.create({
      model: this.config.model,
      messages: req.messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: req.temperature ?? 0.7,
      max_tokens: req.maxTokens,
      stream: false,
    });

    const content = response.choices[0]?.message?.content ?? '';
    const usage = response.usage
      ? {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens,
        }
      : undefined;

    return { content, usage };
  }
}
