import { Controller, Get } from '@nestjs/common';
import { SERVICE_CATEGORIES } from '../../core/categories';

@Controller('categories')
export class CategoriesController {
  @Get()
  list() {
    return { categories: SERVICE_CATEGORIES };
  }
}
