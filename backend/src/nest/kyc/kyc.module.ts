import { Module } from '@nestjs/common';
import { KycController } from './kyc.controller';
import { KycDevController } from './kyc.dev.controller';
import { DiditSessionController } from './didit-session.controller';
import { KycService } from './kyc.service';

const IS_EMULATOR = Boolean(process.env.FUNCTIONS_EMULATOR || process.env.FIREBASE_AUTH_EMULATOR_HOST || process.env.FIREBASE_EMULATOR_HUB);

@Module({
  controllers: IS_EMULATOR
    ? [KycController, KycDevController, DiditSessionController]
    : [KycController, DiditSessionController],
  providers: [KycService],
  exports: [KycService],
})
export class KycModule {}
