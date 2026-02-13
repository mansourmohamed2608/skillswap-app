import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class RegisterDeviceDto {
  @IsString()
  @IsNotEmpty({ message: 'Device token is required' })
  @MaxLength(500, { message: 'Device token is too long' })
  token!: string;
}
