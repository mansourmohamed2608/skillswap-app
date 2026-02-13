import { BadRequestException, Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AnalyticsService } from './analytics.service';
import { FirebaseAuthGuard } from '../common/firebase-auth.guard';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @UseGuards(FirebaseAuthGuard)
  @Post('event')
  async event(@Body() body: any, @Req() req: Request) {
    const uid = (req as any)?.user?.uid;
    if (!uid) throw new BadRequestException('Unauthenticated request');
    return this.analyticsService.recordEvent(uid, body);
  }
}
