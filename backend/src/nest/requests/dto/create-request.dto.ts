import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateRequestDto {
  @IsString()
  @MaxLength(128)
  listingId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  proposedTime?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  message?: string;
}
