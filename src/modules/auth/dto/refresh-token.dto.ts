import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    description: 'الـ Refresh Token المستلم عند تسجيل الدخول الناجح',
  })
  @IsString()
  refreshToken: string;
}
