import { IsObject } from 'class-validator';

export class UpdateProfileDto {
  @IsObject()
  profile!: Record<string, any>;
}

