import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsMongoId,
} from 'class-validator';

export class CreateLeadDto {
  @ApiProperty({
    example: 'أحمد محمود العشماوي',
    description: 'الاسم الكامل للعميل المهتم',
  })
  @IsString()
  @IsNotEmpty({ message: 'الاسم الكامل مطلوب' })
  fullName: string;

  @ApiProperty({
    example: '01234567890',
    description: 'رقم الهاتف (يفضل واتساب)',
  })
  @IsString()
  @IsNotEmpty({ message: 'رقم الهاتف مطلوب للاتصال بك' })
  phoneNumber: string;

  @ApiProperty({ example: 'ahmed@gmail.com', required: false })
  @IsEmail({}, { message: 'البريد الإلكتروني غير صالح' })
  @IsOptional()
  email?: string;

  @ApiProperty({
    example: '6a5601209026bd4c1999ed73',
    description: 'معرف (ID) المشروع العقاري المهتم به',
  })
  @IsMongoId({ message: 'معرف المشروع العقاري غير صالح' })
  @IsNotEmpty({ message: 'يجب ربط العميل بمشروع عقاري معين' })
  projectId: string;
}
