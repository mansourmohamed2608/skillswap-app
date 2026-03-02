import { Module } from '@nestjs/common';
import { KycController } from './kyc.controller';
import { KycService } from './kyc.service';
import { DiditSessionController } from './didit-session.controller';

@Module({
  controllers: [KycController, DiditSessionController],
  providers: [KycService],
  exports: [KycService],
})
export class KycModule {}
