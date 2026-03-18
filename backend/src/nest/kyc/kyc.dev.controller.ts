import { Body, Controller, NotFoundException, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { KycService } from './kyc.service';
import { FirebaseAuthGuard } from '../common/firebase-auth.guard';
import { AdminGuard } from '../common/admin.guard';

const IS_EMULATOR = Boolean(process.env.FUNCTIONS_EMULATOR || process.env.FIREBASE_AUTH_EMULATOR_HOST || process.env.FIREBASE_EMULATOR_HUB);

@Controller('kyc')
export class KycDevController {
  constructor(private readonly kycService: KycService) {}

  @UseGuards(FirebaseAuthGuard, AdminGuard)
  @Post('dev-verify')
  async devVerify(@Body('vendor') vendor: string | null, @Req() req: Request) {
    if (!IS_EMULATOR) throw new NotFoundException();
    const uid = (req as any)?.user?.uid || null;
    if (!uid) throw new UnauthorizedException('Authentication required');
    return this.kycService.devVerify(uid, vendor || null);
  }
}
