import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service';

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
  ) {
    if ((q || '').length > 500) throw new BadRequestException('Search query too long (max 500 characters)');
    if ((category || '').length > 100) throw new BadRequestException('Category filter too long (max 100 characters)');
    if ((location || '').length > 200) throw new BadRequestException('Location filter too long (max 200 characters)');
    return this.searchService.searchListings({
      q: q || '',
      category: category || '',
      location: location || '',
      nearLat: nearLat !== undefined ? Number(nearLat) : undefined,
      nearLng: nearLng !== undefined ? Number(nearLng) : undefined,
      radiusKm: radiusKm !== undefined ? Number(radiusKm) : undefined,
      page: page !== undefined ? Number(page) : 0,
      pageSize: pageSize !== undefined ? Number(pageSize) : undefined,
    });
  }
}
