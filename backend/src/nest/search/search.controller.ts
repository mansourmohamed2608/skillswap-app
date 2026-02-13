import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('listings')
  async listings(
    @Query('q') q?: string,
    @Query('category') category?: string,
    @Query('location') location?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.searchService.searchListings({
      q: q || '',
      category: category || '',
      location: location || '',
      page: page !== undefined ? Number(page) : 0,
      pageSize: pageSize !== undefined ? Number(pageSize) : undefined,
    });
  }
}
