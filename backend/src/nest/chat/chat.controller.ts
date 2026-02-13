import { BadRequestException, Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { ChatService } from './chat.service';
import { FirebaseAuthGuard } from '../common/firebase-auth.guard';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @UseGuards(FirebaseAuthGuard)
  @Post('send')
  async send(@Body() body: { recipientId?: string; text?: string }, @Req() req: Request) {
    const uid = (req as any)?.user?.uid;
    if (!uid) throw new BadRequestException('Authentication required');
    return this.chatService.sendMessage(uid, body || {});
  }

  @UseGuards(FirebaseAuthGuard)
  @Post('read')
  async markRead(@Body() body: { conversationId?: string }, @Req() req: Request) {
    const uid = (req as any)?.user?.uid;
    if (!uid) throw new BadRequestException('Authentication required');
    const convId = String(body?.conversationId || '').trim();
    return this.chatService.markRead(uid, convId);
  }
}
