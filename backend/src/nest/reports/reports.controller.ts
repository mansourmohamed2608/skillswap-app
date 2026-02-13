import { BadRequestException, Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { ReportsService } from './reports.service';
import { FirebaseAuthGuard } from '../common/firebase-auth.guard';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @UseGuards(FirebaseAuthGuard)
  @Post()
  async submit(@Body() body: { type?: string; contentId?: string; reason?: string; note?: string }, @Req() req: Request) {
    const uid = (req as any)?.user?.uid;
    if (!uid) throw new BadRequestException('Authentication required');
    return this.reportsService.submitReport(uid, body || {});
  }
}
