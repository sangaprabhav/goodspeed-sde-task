import { Global, Module } from '@nestjs/common';
import { createAIRegistry, loadAIConfigFromEnv, type AIRegistry } from '@repo/ai';
import { UserAIService } from './user-ai.service';

export const AI_REGISTRY = 'AI_REGISTRY';

@Global()
@Module({
  providers: [
    {
      provide: AI_REGISTRY,
      useFactory: (): AIRegistry => {
        const config = loadAIConfigFromEnv();
        const registry = createAIRegistry(config);
        console.log(
          `[AI] Chat: ${config.chat.provider}/${config.chat.model} | Embedding: ${config.embedding.provider}/${config.embedding.model} (${config.embedding.dimensions}d)`,
        );
        return registry;
      },
    },
    UserAIService,
  ],
  exports: [AI_REGISTRY, UserAIService],
})
export class AiModule {}
