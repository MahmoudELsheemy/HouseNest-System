import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ResendOtpDto {
  @ApiProperty({ description: 'التوكن المؤقت المستلم من خطوة الـ Login' })
  @IsString()
  tempToken: string;
}
