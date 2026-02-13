import { BadRequestException, Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { EventsService } from './events.service';
import { FirebaseAuthGuard } from '../common/firebase-auth.guard';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  async list(@Query('limit') limit?: string) {
    return this.eventsService.listEvents(limit ? Number(limit) : undefined);
  }

  @UseGuards(FirebaseAuthGuard)
  @Post()
  async create(@Body() body: Record<string, any>, @Req() req: Request) {
    const uid = (req as any)?.user?.uid;
    if (!uid) throw new BadRequestException('Authentication required');
    return this.eventsService.createEvent(uid, body);
  }

  @UseGuards(FirebaseAuthGuard)
  @Post(':id/register')
  async register(@Param('id') id: string, @Req() req: Request) {
    const uid = (req as any)?.user?.uid;
    if (!uid) throw new BadRequestException('Authentication required');
    return this.eventsService.register(uid, id);
  }
}
