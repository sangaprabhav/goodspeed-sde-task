import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { updateAISettingsSchema } from '@repo/shared';
import { UserAIService } from '../ai/user-ai.service';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import { CurrentUser, AccessToken, AuthUser } from '../common/decorators/current-user.decorator';

@Controller('settings')
@UseGuards(SupabaseAuthGuard)
export class SettingsController {
  constructor(private readonly userAI: UserAIService) {}

  @Get('ai')
  async getAI(@CurrentUser() user: AuthUser, @AccessToken() token: string) {
    return this.userAI.getSettings(user.id, token);
  }

  @Patch('ai')
  async updateAI(
    @CurrentUser() user: AuthUser,
    @AccessToken() token: string,
    @Body() body: unknown,
  ) {
    const input = updateAISettingsSchema.parse(body);
    return this.userAI.updateSettings(
      user.id,
      {
        chatModel: input.chatModel,
        embeddingModel: input.embeddingModel,
      },
      token,
    );
  }
}
