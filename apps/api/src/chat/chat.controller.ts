import {
  Controller,
  Post,
  Param,
  Body,
  HttpException,
  UseGuards,
  Res,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { ChatService } from './chat.service';
import { ConversationsService } from '../conversations/conversations.service';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import { CurrentUser, AccessToken, AuthUser } from '../common/decorators/current-user.decorator';
import { ApiErrorCode, sendMessageSchema } from '@repo/shared';

@Controller('chat')
@UseGuards(SupabaseAuthGuard)
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly conversations: ConversationsService,
  ) {}

  @Post(':conversationId/messages')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async sendMessage(
    @CurrentUser() user: AuthUser,
    @AccessToken() token: string,
    @Param('conversationId') conversationId: string,
    @Body() body: unknown,
    @Res() res: Response,
  ) {
    const input = sendMessageSchema.parse(body);

    const conversation = await this.conversations.get(
      user.id,
      conversationId,
      token,
    );
    if (!conversation) throw new NotFoundException('Conversation not found');

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      for await (const event of this.chatService.streamChat(
        user.id,
        conversationId,
        input.content,
        token,
      )) {
        res.write(`event: ${event.event}\ndata: ${JSON.stringify(event.data)}\n\n`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Chat failed';
      const code =
        err instanceof HttpException && err.getStatus() === 409
          ? ApiErrorCode.EMBEDDING_SPACE_MISMATCH
          : ApiErrorCode.PROVIDER_ERROR;
      res.write(
        `event: error\ndata: ${JSON.stringify({ code, message })}\n\n`,
      );
    }

    res.end();
  }
}
