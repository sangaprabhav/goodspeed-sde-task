import { Controller, Get, UseGuards } from '@nestjs/common';
import { UsageService } from './usage.service';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import { CurrentUser, AccessToken, AuthUser } from '../common/decorators/current-user.decorator';

@Controller('usage')
@UseGuards(SupabaseAuthGuard)
export class UsageController {
  constructor(private readonly usage: UsageService) {}

  @Get('summary')
  async summary(@CurrentUser() user: AuthUser, @AccessToken() token: string) {
    return this.usage.getSummary(user.id, token);
  }
}
