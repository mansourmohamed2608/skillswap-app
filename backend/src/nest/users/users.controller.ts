import { BadRequestException, Body, Controller, Get, HttpException, NotFoundException, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import * as admin from 'firebase-admin';
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

  @Get('phone-available')
  async phoneAvailable(@Query('value') value?: string) {
    const phone = String(value || '').trim();
    if (!phone) throw new BadRequestException('Missing value');
    try {
      const available = await this.usersService.isPhoneAvailable(phone);
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

  @Get('search')
  async searchUsers(@Query('q') q?: string, @Query('limit') limit?: string) {
    const query = String(q || '').trim();
    if (!query) throw new BadRequestException('Missing q');
    const lim = limit ? Number(limit) : 8;
    return { items: await this.usersService.searchPublicProfiles(query, lim) };
  }

  @Post('bootstrap')
  async bootstrapAccount(@Body() body: Record<string, any>, @Req() req: Request) {
    const authHeader = String(req.headers.authorization || '');
    const match = /^Bearer (.+)$/.exec(authHeader);
    if (!match) throw new HttpException('Missing or invalid Authorization header', 401);
    try {
      const decoded = await admin.auth().verifyIdToken(match[1]);
      await this.usersService.bootstrapAccount(decoded.uid, body, decoded.email || null);
      return { success: true };
    } catch (err) {
      if (err instanceof StatusError) {
        throw new HttpException(err.message, err.status);
      }
      throw new HttpException('Invalid or expired token', 401);
    }
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

  @UseGuards(FirebaseAuthGuard)
  @Post('notifications/read')
  async markNotificationsRead(@Body() body: { ids?: string[] }, @Req() req: Request) {
    const anyReq: any = req as any;
    const userId: string | undefined = anyReq?.user?.uid;
    try {
      const updated = await this.usersService.markNotificationsRead(userId || '', body?.ids);
      return { success: true, updated };
    } catch (err) {
      if (err instanceof StatusError) {
        throw new HttpException(err.message, err.status);
      }
      throw err;
    }
  }

  @UseGuards(FirebaseAuthGuard)
  @Post('block')
  async blockUser(@Body() body: { targetUid?: string }, @Req() req: Request) {
    const anyReq: any = req as any;
    const userId: string | undefined = anyReq?.user?.uid;
    if (!userId) throw new BadRequestException('Unauthenticated');
    const targetUid = String(body?.targetUid || '').trim();
    if (!targetUid) throw new BadRequestException('Missing targetUid');
    if (targetUid === userId) throw new BadRequestException('Cannot block yourself');
    try {
      await this.usersService.blockUser(userId, targetUid);
      return { success: true };
    } catch (err) {
      if (err instanceof StatusError) throw new HttpException(err.message, err.status);
      throw err;
    }
  }

  @UseGuards(FirebaseAuthGuard)
  @Post('unblock')
  async unblockUser(@Body() body: { targetUid?: string }, @Req() req: Request) {
    const anyReq: any = req as any;
    const userId: string | undefined = anyReq?.user?.uid;
    if (!userId) throw new BadRequestException('Unauthenticated');
    const targetUid = String(body?.targetUid || '').trim();
    if (!targetUid) throw new BadRequestException('Missing targetUid');
    try {
      await this.usersService.unblockUser(userId, targetUid);
      return { success: true };
    } catch (err) {
      if (err instanceof StatusError) throw new HttpException(err.message, err.status);
      throw err;
    }
  }
}
