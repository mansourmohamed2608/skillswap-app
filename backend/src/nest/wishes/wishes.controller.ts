import { BadRequestException, Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import * as admin from 'firebase-admin';
import { WishesService } from './wishes.service';
import { FirebaseAuthGuard } from '../common/firebase-auth.guard';

@Controller('wishes')
export class WishesController {
  constructor(private readonly wishesService: WishesService) {}

  @UseGuards(FirebaseAuthGuard)
  @Post('create')
  async create(@Body() body: any, @Req() req: Request) {
    const uid = (req as any)?.user?.uid;
    if (!uid) throw new BadRequestException('Unauthenticated request');
    return this.wishesService.create(uid, body);
  }

  @Post(':id/donate')
  async donate(@Param('id') id: string, @Body() body: any, @Req() req: Request) {
    const authHeader = String(req.headers?.authorization || '').trim();
    let donorUserId: string | null = null;
    if (authHeader.toLowerCase().startsWith('bearer ')) {
      const token = authHeader.slice(7).trim();
      if (token) {
        try {
          const decoded = await admin.auth().verifyIdToken(token);
          donorUserId = decoded?.uid || null;
        } catch {
          donorUserId = null;
        }
      }
    }
    return this.wishesService.donate(id, body, donorUserId);
  }

  @Get(':id/donors')
  async donors(@Param('id') id: string, @Query('limit') limit?: string) {
    const lim = limit ? Number(limit) : 5;
    return { items: await this.wishesService.listRecentDonors(id, lim) };
  }
}
