import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ description: 'التوكن المؤقت المستلم من خطوة Forget Password' })
  @IsString()
  tempToken: string;

  @ApiProperty({
    example: '123456',
    description: 'كود الـ OTP المرسل إلى الإيميل للاستعادة',
  })
  @IsString()
  @Length(6, 6, { message: 'يجب أن يتكون كود التحقق من 6 أرقام تماماً' })
  code: string;

  @ApiProperty({
    example: 'NewAdmin@12345',
    description: 'كلمة المرور الجديدة',
  })
  @IsString()
  @MinLength(6, { message: 'كلمة المرور الجديدة يجب ألا تقل عن 6 أحرف' })
  newPassword: string;
}
