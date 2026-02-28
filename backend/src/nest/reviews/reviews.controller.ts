import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
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

  @UseGuards(FirebaseAuthGuard)
  @Post(':reviewId/update')
  async updateLegacy(@Param('reviewId') reviewId: string, @Body() body: { rating?: number; comment?: string }, @Req() req: Request) {
    const reviewerId = ((req as any)?.user?.uid || null) as string | null;
    if (!reviewId) throw new BadRequestException('Missing reviewId');
    return this.reviewsService.updateReview(reviewerId, reviewId, body);
  }

  @UseGuards(FirebaseAuthGuard)
  @Patch(':reviewId')
  async update(@Param('reviewId') reviewId: string, @Body() body: { rating?: number; comment?: string }, @Req() req: Request) {
    const reviewerId = ((req as any)?.user?.uid || null) as string | null;
    if (!reviewId) throw new BadRequestException('Missing reviewId');
    return this.reviewsService.updateReview(reviewerId, reviewId, body);
  }

  @UseGuards(FirebaseAuthGuard)
  @Post('update/:reviewId')
  async updateCompat(@Param('reviewId') reviewId: string, @Body() body: { rating?: number; comment?: string }, @Req() req: Request) {
    const reviewerId = ((req as any)?.user?.uid || null) as string | null;
    if (!reviewId) throw new BadRequestException('Missing reviewId');
    return this.reviewsService.updateReview(reviewerId, reviewId, body);
  }

  @UseGuards(FirebaseAuthGuard)
  @Post(':reviewId/delete')
  async removeLegacy(@Param('reviewId') reviewId: string, @Req() req: Request) {
    const reviewerId = ((req as any)?.user?.uid || null) as string | null;
    if (!reviewId) throw new BadRequestException('Missing reviewId');
    return this.reviewsService.deleteReview(reviewerId, reviewId);
  }

  @UseGuards(FirebaseAuthGuard)
  @Delete(':reviewId')
  async remove(@Param('reviewId') reviewId: string, @Req() req: Request) {
    const reviewerId = ((req as any)?.user?.uid || null) as string | null;
    if (!reviewId) throw new BadRequestException('Missing reviewId');
    return this.reviewsService.deleteReview(reviewerId, reviewId);
  }

  @UseGuards(FirebaseAuthGuard)
  @Post('delete/:reviewId')
  async removeCompat(@Param('reviewId') reviewId: string, @Req() req: Request) {
    const reviewerId = ((req as any)?.user?.uid || null) as string | null;
    if (!reviewId) throw new BadRequestException('Missing reviewId');
    return this.reviewsService.deleteReview(reviewerId, reviewId);
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
