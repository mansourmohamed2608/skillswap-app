import { IsString, MaxLength } from 'class-validator';

export class FinalizeKycDto {
  @IsString()
  @MaxLength(256)
  vendor!: string;
}
