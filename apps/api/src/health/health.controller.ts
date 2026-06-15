import { Controller, Get, Inject } from '@nestjs/common';
import type { AIRegistry } from '@repo/ai';
import { AI_REGISTRY } from '../ai/ai.module';
import { SupabaseService } from '../supabase/supabase.service';

@Controller('health')
export class HealthController {
  constructor(
    @Inject(AI_REGISTRY) private readonly ai: AIRegistry,
    private readonly supabase: SupabaseService,
  ) {}

  @Get()
  async check() {
    let dbStatus = 'ok';
    try {
      const client = this.supabase.getServiceClient();
      const { error } = await client.from('documents').select('id').limit(1);
      if (error) dbStatus = 'error';
    } catch {
      dbStatus = 'error';
    }

    return {
      status: dbStatus === 'ok' ? 'healthy' : 'degraded',
      database: dbStatus,
      ai: {
        chatProvider: this.ai.chat.id,
        embeddingProvider: this.ai.embedding.id,
        embeddingModel: this.ai.embedding.model,
        embeddingDimensions: this.ai.embedding.dimensions,
      },
    };
  }
}
