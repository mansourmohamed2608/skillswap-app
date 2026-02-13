import { BadRequestException, Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { DevicesService } from './devices.service';
import { FirebaseAuthGuard } from '../common/firebase-auth.guard';
import { RegisterDeviceDto } from './dto/register-device.dto';

@Controller('user/devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @UseGuards(FirebaseAuthGuard)
  @Post('register')
  async register(@Body() body: RegisterDeviceDto, @Req() req: Request) {
    const uid = (req as any)?.user?.uid;
    if (!uid) throw new BadRequestException('Unauthenticated request');
    return this.devicesService.register(uid, body.token);
  }
}
