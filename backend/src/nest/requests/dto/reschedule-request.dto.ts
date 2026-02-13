import { IsString, MaxLength } from 'class-validator';

export class RescheduleRequestDto {
  @IsString()
  @MaxLength(64)
  proposedTime!: string;
}
