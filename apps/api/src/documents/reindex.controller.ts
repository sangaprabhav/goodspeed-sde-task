import { Controller, Post, UseGuards } from '@nestjs/common';
import { IngestionService } from '../ingestion/ingestion.service';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import { CurrentUser, AccessToken, AuthUser } from '../common/decorators/current-user.decorator';

@Controller('documents')
@UseGuards(SupabaseAuthGuard)
export class ReindexController {
  constructor(private readonly ingestion: IngestionService) {}

  @Post('reindex')
  async reindex(@CurrentUser() user: AuthUser, @AccessToken() token: string) {
    return this.ingestion.reindexAll(user.id, token);
  }
}
