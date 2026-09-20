import { BadRequestException, Controller, ForbiddenException, Get, Query, Req, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import * as admin from 'firebase-admin';
import { SearchService } from './search.service';
import { COUNTRY_GROUPS, isMiddleEastCountry } from '../../core/constants';
import { isMembershipActive } from '../../core/membership';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('listings')
  async listings(
    @Query('q') q?: string,
    @Query('category') category?: string,
    @Query('location') location?: string,
    @Query('nearLat') nearLat?: string,
    @Query('nearLng') nearLng?: string,
    @Query('radiusKm') radiusKm?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('region') region?: string,
    @Req() req?: Request,
  ) {
    if ((q || '').length > 500) throw new BadRequestException('Search query too long (max 500 characters)');
    if ((category || '').length > 100) throw new BadRequestException('Category filter too long (max 100 characters)');
    if ((location || '').length > 200) throw new BadRequestException('Location filter too long (max 200 characters)');
    let verifiedRegionAccess: { userCountry: string; isPro: boolean } | undefined;
    if (region === COUNTRY_GROUPS.MIDDLE_EAST_LOBBY) {
      const authorization = String(req?.headers?.authorization || '');
      const token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
      if (!token) throw new UnauthorizedException({ code: 'AUTH_REQUIRED', message: 'Sign in to use the Middle East lobby' });
      let uid = '';
      try {
        uid = (await admin.auth().verifyIdToken(token)).uid;
      } catch {
        throw new UnauthorizedException({ code: 'AUTH_REQUIRED', message: 'Invalid authentication token' });
      }
      const userSnap = await admin.firestore().collection('users').doc(uid).get();
      if (!userSnap.exists) throw new UnauthorizedException({ code: 'PROFILE_REQUIRED', message: 'Complete your profile first' });
      const membership = userSnap.get('membership');
      const isPro = membership?.active === true && membership?.plan === 'Pro' && isMembershipActive(membership);
      if (!isPro) throw new ForbiddenException({ code: 'REGION_SUBSCRIPTION_REQUIRED', message: 'An active Pro plan is required for the Middle East lobby' });
      const country = String(
        userSnap.get('locationMeta.country') ||
        userSnap.get('profile.country') ||
        userSnap.get('country') ||
        '',
      ).trim();
      if (!country || !isMiddleEastCountry(country)) {
        throw new ForbiddenException({ code: 'REGION_COUNTRY_REQUIRED', message: 'A supported profile country is required for the Middle East lobby' });
      }
      verifiedRegionAccess = { userCountry: country, isPro: true };
    }

    return this.searchService.searchListings({
      q: q || '',
      category: category || '',
      location: location || '',
      nearLat: nearLat !== undefined ? Number(nearLat) : undefined,
      nearLng: nearLng !== undefined ? Number(nearLng) : undefined,
      radiusKm: radiusKm !== undefined ? Number(radiusKm) : undefined,
      page: page !== undefined ? Number(page) : 0,
      pageSize: pageSize !== undefined ? Number(pageSize) : undefined,
      region: region === COUNTRY_GROUPS.MIDDLE_EAST_LOBBY ? COUNTRY_GROUPS.MIDDLE_EAST_LOBBY : undefined,
      userCountry: verifiedRegionAccess?.userCountry,
      isPro: verifiedRegionAccess?.isPro === true,
    });
  }
}
