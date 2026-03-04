import { Controller, Get, Post, Query, Body, Req, BadRequestException, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { MatchmakingService } from './matchmaking.service';
import { AcceptMatchDto } from './dto/accept.dto';
import { FirebaseAuthGuard } from '../common/firebase-auth.guard';

@Controller('matchmaking')
export class MatchmakingController {
  constructor(private readonly matchmakingService: MatchmakingService) {}

  @UseGuards(FirebaseAuthGuard)
  @Get('recommendations')
  async recommendations(@Req() req: Request) {
    const uid = (req as any)?.user?.uid;
    if (!uid) throw new BadRequestException('Authentication required');
    return this.matchmakingService.recommendations(uid);
  }

  @UseGuards(FirebaseAuthGuard)
  @Get('cycles3')
  async cycles3(@Req() req: Request) {
    const uid = (req as any)?.user?.uid;
    if (!uid) throw new BadRequestException('Authentication required');
    return this.matchmakingService.cycles3(uid);
  }

  @UseGuards(FirebaseAuthGuard)
  @Get('mutual2')
  async mutual2(@Req() req: Request) {
    const uid = (req as any)?.user?.uid;
    if (!uid) throw new BadRequestException('Authentication required');
    return this.matchmakingService.mutual2(uid);
  }

  @UseGuards(FirebaseAuthGuard)
  @Get('listing-matches')
  async listingMatches(@Req() req: Request) {
    const uid = (req as any)?.user?.uid;
    if (!uid) throw new BadRequestException('Authentication required');
    return this.matchmakingService.listingMatches(uid);
  }

  @UseGuards(FirebaseAuthGuard)
  @Post('accept')
  async accept(@Body() body: AcceptMatchDto, @Req() req: Request) {
    const uid = (req as any)?.user?.uid;
    if (!uid) throw new BadRequestException('Authentication required');
    return this.matchmakingService.accept(uid, body);
  }
}
