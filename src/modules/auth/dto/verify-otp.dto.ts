import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class VerifyOtpDto {
  @ApiProperty({ description: 'التوكن المؤقت المستلم من خطوة الـ Login' })
  @IsString()
  tempToken: string;

  @ApiProperty({
    example: '123456',
    description: 'كود الـ OTP المكون من 6 أرقام',
  })
  @IsString()
  @Length(6, 6, { message: 'يجب أن يتكون كود التحقق من 6 أرقام تماماً' })
  code: string;
}
