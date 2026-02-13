import { Body, Controller, HttpException, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { StatusError, UsersService } from './users.service';
import { FirebaseAuthGuard } from '../common/firebase-auth.guard';

@Controller('user')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(FirebaseAuthGuard)
  @Post('profile')
  async updateProfile(@Body() body: UpdateProfileDto, @Req() req: Request) {
    const anyReq: any = req as any;
    const userId: string | undefined = anyReq?.user?.uid;
    try {
      await this.usersService.updateProfile(userId || '', body.profile);
    } catch (err) {
      if (err instanceof StatusError) {
        throw new HttpException(err.message, err.status);
      }
      throw err;
    }
    return { success: true };
  }
}
