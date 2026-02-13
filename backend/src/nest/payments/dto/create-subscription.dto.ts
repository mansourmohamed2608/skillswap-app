import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSubscriptionDto {
  @IsString()
  @MaxLength(64)
  plan!: string;

  @IsString()
  @MaxLength(64)
  duration!: string;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  currency?: string;
}
