import { IsArray, IsIn, IsString } from 'class-validator';

export class AcceptMatchDto {
  @IsIn(['triad', 'mutual'])
  type!: 'triad' | 'mutual';

  @IsArray()
  users!: string[];

  @IsArray()
  edges!: any[];
}
