import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ForgetPasswordDto {
  @ApiProperty({
    example: 'admin@house-nest.com',
    description: 'البريد الإلكتروني لحساب المسؤول',
  })
  @IsEmail({}, { message: 'البريد الإلكتروني غير صالح' })
  email: string;
}
