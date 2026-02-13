import { BadRequestException, Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
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
  async donate(@Param('id') id: string, @Body() body: any) {
    return this.wishesService.donate(id, body);
  }
}
