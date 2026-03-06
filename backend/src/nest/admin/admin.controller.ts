import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AdminService } from './admin.service';
import { AdminGuard } from '../common/admin.guard';
import { FirebaseAuthGuard } from '../common/firebase-auth.guard';

@UseGuards(FirebaseAuthGuard, AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('flagged')
  async listFlagged(@Req() req: Request) {
    const uid = (req as any).user.uid as string;
    return this.adminService.listFlagged(uid);
  }

  @Post('flagged/:type/:id/dismiss')
  async dismiss(@Param('type') type: string, @Param('id') id: string, @Req() req: Request) {
    const uid = (req as any).user.uid as string;
    return this.adminService.dismissFlag(uid, type as any, id);
  }

  @Post('flagged/:type/:id/remove')
  async remove(@Param('type') type: string, @Param('id') id: string, @Req() req: Request) {
    const uid = (req as any).user.uid as string;
    return this.adminService.removeFlagged(uid, type as any, id);
  }

  @Get('keywords')
  async listKeywords(@Req() req: Request) {
    const uid = (req as any).user.uid as string;
    return this.adminService.listKeywords(uid);
  }

  @Post('keywords')
  async addKeywords(@Body() body: { keyword?: string; keywords?: string[] }, @Req() req: Request) {
    const uid = (req as any).user.uid as string;
    return this.adminService.addKeywords(uid, body || {});
  }

  @Post('keywords/remove')
  async removeKeywords(@Body() body: { keyword?: string; keywords?: string[] }, @Req() req: Request) {
    const uid = (req as any).user.uid as string;
    return this.adminService.removeKeywords(uid, body || {});
  }

  @Get('users')
  async listUsers(@Req() req: Request, @Query('limit') limit?: string) {
    const uid = (req as any).user.uid as string;
    return this.adminService.listUsers(uid, limit ? Number(limit) : undefined);
  }

  @Post('users/:id/role')
  async updateRole(@Param('id') id: string, @Body() body: { role?: string }, @Req() req: Request) {
    const uid = (req as any).user.uid as string;
    return this.adminService.updateUserRole(uid, id, (body?.role || '') as any);
  }

  @Post('users/:id/status')
  async updateStatus(@Param('id') id: string, @Body() body: { status?: string }, @Req() req: Request) {
    const uid = (req as any).user.uid as string;
    return this.adminService.updateUserStatus(uid, id, (body?.status || '') as any);
  }

  @Get('audit')
  async listAudit(@Req() req: Request, @Query('limit') limit?: string) {
    const uid = (req as any).user.uid as string;
    return this.adminService.listAudit(uid, limit ? Number(limit) : undefined);
  }

  @Get('analytics')
  async listAnalytics(@Req() req: Request, @Query('limit') limit?: string) {
    const uid = (req as any).user.uid as string;
    return this.adminService.listAnalytics(uid, limit ? Number(limit) : undefined);
  }

  @Get('reports')
  async listReports(@Req() req: Request, @Query('limit') limit?: string) {
    const uid = (req as any).user.uid as string;
    return this.adminService.listReports(uid, limit ? Number(limit) : undefined);
  }

  @Post('reports/:id/resolve')
  async resolveReport(@Param('id') id: string, @Body() body: { action?: 'dismiss' | 'remove' }, @Req() req: Request) {
    const uid = (req as any).user.uid as string;
    const action = body?.action === 'remove' ? 'remove' : 'dismiss';
    return this.adminService.resolveReport(uid, id, action);
  }
}
