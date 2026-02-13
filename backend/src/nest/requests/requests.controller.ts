import { BadRequestException, Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { RequestsService } from './requests.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { RescheduleRequestDto } from './dto/reschedule-request.dto';
import { FirebaseAuthGuard } from '../common/firebase-auth.guard';

@Controller('requests')
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @UseGuards(FirebaseAuthGuard)
  @Post()
  async create(@Body() body: CreateRequestDto, @Req() req: Request) {
    const uid = (req as any)?.user?.uid;
    if (!uid) throw new BadRequestException('Authentication required');
    return this.requestsService.createRequest(uid, body);
  }

  @UseGuards(FirebaseAuthGuard)
  @Post(':id/reschedule')
  async reschedule(@Param('id') id: string, @Body() body: RescheduleRequestDto, @Req() req: Request) {
    const uid = (req as any)?.user?.uid;
    if (!uid) throw new BadRequestException('Authentication required');
    return this.requestsService.reschedule(uid, id, body.proposedTime);
  }

  @UseGuards(FirebaseAuthGuard)
  @Post(':id/accept')
  async accept(@Param('id') id: string, @Req() req: Request) {
    const uid = (req as any)?.user?.uid;
    if (!uid) throw new BadRequestException('Authentication required');
    return this.requestsService.accept(uid, id);
  }

  @UseGuards(FirebaseAuthGuard)
  @Post(':id/decline')
  async decline(@Param('id') id: string, @Req() req: Request) {
    const uid = (req as any)?.user?.uid;
    if (!uid) throw new BadRequestException('Authentication required');
    return this.requestsService.decline(uid, id);
  }

  @UseGuards(FirebaseAuthGuard)
  @Post(':id/cancel')
  async cancel(@Param('id') id: string, @Req() req: Request) {
    const uid = (req as any)?.user?.uid;
    if (!uid) throw new BadRequestException('Authentication required');
    return this.requestsService.cancel(uid, id);
  }

  @UseGuards(FirebaseAuthGuard)
  @Post(':id/complete')
  async complete(@Param('id') id: string, @Req() req: Request) {
    const uid = (req as any)?.user?.uid;
    if (!uid) throw new BadRequestException('Authentication required');
    return this.requestsService.complete(uid, id);
  }
}
