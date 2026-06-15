import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import { CurrentUser, AccessToken, AuthUser } from '../common/decorators/current-user.decorator';

@Controller('conversations')
@UseGuards(SupabaseAuthGuard)
export class ConversationsController {
  constructor(private readonly conversations: ConversationsService) {}

  @Get()
  async list(@CurrentUser() user: AuthUser, @AccessToken() token: string) {
    return this.conversations.list(user.id, token);
  }

  @Post()
  async create(
    @CurrentUser() user: AuthUser,
    @AccessToken() token: string,
    @Body() body: unknown,
  ) {
    return this.conversations.create(user.id, body, token);
  }

  @Get(':id/messages')
  async getMessages(
    @CurrentUser() user: AuthUser,
    @AccessToken() token: string,
    @Param('id') id: string,
  ) {
    const conversation = await this.conversations.get(user.id, id, token);
    if (!conversation) throw new NotFoundException('Conversation not found');
    return this.conversations.getMessages(user.id, id, token);
  }

  @Delete(':id')
  async remove(
    @CurrentUser() user: AuthUser,
    @AccessToken() token: string,
    @Param('id') id: string,
  ) {
    await this.conversations.remove(user.id, id, token);
    return { success: true };
  }
}
