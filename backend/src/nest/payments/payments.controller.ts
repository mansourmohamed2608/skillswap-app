import { BadRequestException, Body, Controller, ForbiddenException, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { FirebaseAuthGuard } from '../common/firebase-auth.guard';

const IS_EMULATOR = Boolean(
  process.env.FUNCTIONS_EMULATOR ||
  process.env.FIREBASE_AUTH_EMULATOR_HOST ||
  process.env.FIREBASE_EMULATOR_HUB,
);

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

  /** DEV / EMULATOR ONLY — blocked in production */
  @Post('mock-complete')
  async mockComplete(@Body('sessionId') sessionId: string) {
    if (!IS_EMULATOR) {
      throw new ForbiddenException('This endpoint is only available in the local emulator environment');
    }
    return this.paymentsService.completeMock(sessionId);
  }
}
