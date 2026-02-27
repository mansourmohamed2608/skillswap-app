import { Body, Controller, Get, HttpException, NotFoundException, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { StatusError, UsersService } from './users.service';
import { FirebaseAuthGuard } from '../common/firebase-auth.guard';

@Controller('user')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('username-available/:username')
  async usernameAvailable(@Param('username') username: string) {
    try {
      const available = await this.usersService.isUsernameAvailable(username);
      return { available };
    } catch (err) {
      if (err instanceof StatusError) {
        throw new HttpException(err.message, err.status);
      }
      throw err;
    }
  }

  @Get('public/:identifier')
  async getPublicProfile(@Param('identifier') identifier: string) {
    const profile = await this.usersService.getPublicProfileByIdentifier(identifier);
    if (!profile) throw new NotFoundException('Profile not found');
    return profile;
  }

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
