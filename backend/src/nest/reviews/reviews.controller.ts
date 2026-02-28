import { BadRequestException, Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { FirebaseAuthGuard } from '../common/firebase-auth.guard';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @UseGuards(FirebaseAuthGuard)
  @Post()
  async create(@Body() body: CreateReviewDto, @Req() req: Request) {
    const reviewerId = ((req as any)?.user?.uid || null) as string | null;
    return this.reviewsService.createReview(reviewerId, body);
  }

  @Get('listing/:listingId')
  async listForListing(@Param('listingId') listingId: string, @Query('limit') limit?: string) {
    const lim = limit ? Number(limit) : 50;
    if (!listingId) throw new BadRequestException('Missing listingId');
    return this.reviewsService.listForListing(listingId, lim);
  }

  @Get('user/:userId')
  async listForUser(@Param('userId') userId: string, @Query('limit') limit?: string) {
    const lim = limit ? Number(limit) : 50;
    if (!userId) throw new BadRequestException('Missing userId');
    return this.reviewsService.listForUser(userId, lim);
  }
}
