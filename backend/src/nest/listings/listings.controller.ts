import { Body, Controller, Param, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { ListingsService } from './listings.service';
import { FirebaseAuthGuard } from '../common/firebase-auth.guard';
import { CreateListingDto } from './dto/create-listing.dto';

@Controller('listings')
export class ListingsController {
  constructor(private readonly listingsService: ListingsService) {}

  @UseGuards(FirebaseAuthGuard)
  @Post('create')
  async create(@Body() body: CreateListingDto, @Req() req: Request) {
    const uid = (req as any)?.user?.uid;
    if (!uid) throw new UnauthorizedException({ code: 'AUTH_REQUIRED', message: 'Authentication required' });
    return this.listingsService.createListing(uid, body);
  }

  @UseGuards(FirebaseAuthGuard)
  @Post(':id/update')
  async update(@Param('id') id: string, @Body() body: Record<string, unknown>, @Req() req: Request) {
    const uid = (req as any)?.user?.uid;
    if (!uid) throw new UnauthorizedException({ code: 'AUTH_REQUIRED', message: 'Authentication required' });
    return this.listingsService.updateListing(uid, id, (body?.listing as any) || body);
  }

  @UseGuards(FirebaseAuthGuard)
  @Post(':id/delete')
  async remove(@Param('id') id: string, @Req() req: Request) {
    const uid = (req as any)?.user?.uid;
    if (!uid) throw new UnauthorizedException({ code: 'AUTH_REQUIRED', message: 'Authentication required' });
    return this.listingsService.removeListing(uid, id);
  }
}
