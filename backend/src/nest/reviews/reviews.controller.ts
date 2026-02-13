import { BadRequestException, Body, Controller, Get, Param, Post, Query, Req, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import * as admin from 'firebase-admin';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  async create(@Body() body: CreateReviewDto, @Req() req: Request) {
    const authHeader = (req.headers.authorization || '').toString();
    let reviewerId: string | null = null;
    if (authHeader) {
      const match = /^Bearer (.+)$/.exec(authHeader);
      if (!match) throw new UnauthorizedException('Invalid Authorization header');
      try {
        const decoded = await admin.auth().verifyIdToken(match[1]);
        reviewerId = decoded.uid;
      } catch (e) {
        throw new UnauthorizedException('Invalid or expired token');
      }
    }
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
