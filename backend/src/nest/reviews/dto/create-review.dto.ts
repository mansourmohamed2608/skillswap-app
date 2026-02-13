import { IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateReviewDto {
  @IsString()
  @MaxLength(128)
  listingId!: string;

  @IsNumber()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsString()
  @MaxLength(1000)
  comment!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  reviewerName?: string;
}
