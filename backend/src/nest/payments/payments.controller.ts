import { BadRequestException, Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { FirebaseAuthGuard } from '../common/firebase-auth.guard';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @UseGuards(FirebaseAuthGuard)
  @Post('create-subscription-session')
  async createSession(@Body() body: CreateSubscriptionDto, @Req() req: Request) {
    const uid = (req as any)?.user?.uid;
    if (!uid) throw new BadRequestException('Authentication required');
    const { plan, duration, currency } = body;
    const { paymentUrl } = await this.paymentsService.createSubscriptionSession(uid, plan, duration, currency);
    return { paymentUrl };
  }

  @Post('webhook')
  async webhook(@Req() req: any) {
    const raw = req.rawBody;
    if (!raw || !Buffer.isBuffer(raw)) {
      throw new BadRequestException('Missing raw body for signature verification');
    }
    return this.paymentsService.handleWebhook(raw, req.headers || {});
  }

  @Post('mock-complete')
  async mockComplete(@Body('sessionId') sessionId: string) {
    return this.paymentsService.completeMock(sessionId);
  }
}
