import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsBoolean,
  IsUrl,
} from 'class-validator';

export class CreateProjectDto {
  @ApiProperty({
    example: 'كمبوند بادية أكتوبر',
    description: 'اسم المشروع العقاري',
  })
  @IsString()
  @IsNotEmpty({ message: 'اسم المشروع مطلوب' })
  name: string;

  @ApiProperty({
    example: '6 أكتوبر، الجيزة',
    description: 'موقع المشروع الجغرافي',
  })
  @IsString()
  @IsNotEmpty({ message: 'موقع المشروع مطلوب' })
  location: string;

  @ApiProperty({
    example: 'كمبوند سكني متكامل الخدمات في قلب أكتوبر',
    description: 'وصف قصير للمشروع',
  })
  @IsString()
  @IsNotEmpty({ message: 'الوصف القصير مطلوب' })
  shortDescription: string;

  @ApiProperty({
    example: 'تفاصيل المشروع بالكامل والمساحات المتاحة...',
    required: false,
  })
  @IsString()
  @IsOptional()
  fullDescription?: string;

  @ApiProperty({
    example:
      'https://res.cloudinary.com/dw7x9zwnf/image/upload/v1784024065/lamzohsoehuakcdnuiji.jpg',
    required: false,
  })
  @IsUrl(
    {},
    { message: 'رابط الصورة الرئيسية يجب أن يكون رابطاً سحابياً صحيحاً (URL)' },
  )
  @IsOptional()
  coverImage?: string;

  @ApiProperty({
    example: [
      'https://res.cloudinary.com/dw7x9zwnf/image/upload/v1784024065/lamzohsoehuakcdnuiji.jpg',
    ],
    type: [String],
    required: false,
  })
  @IsArray()
  @IsUrl(
    {},
    {
      each: true,
      message: 'كل رابط في معرض الصور يجب أن يكون رابطاً سحابياً صحيحاً (URL)',
    },
  )
  @IsOptional()
  gallery?: string[];

  @ApiProperty({
    example: ['حمام سباحة', 'جيم', 'أمن 24 ساعة'],
    type: [String],
    required: false,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  amenities?: string[];

  @ApiProperty({ example: 'https://goo.gl/maps/xyz...', required: false })
  @IsUrl({}, { message: 'رابط خرائط جوجل غير صحيح' })
  @IsOptional()
  googleMapsUrl?: string;

  @ApiProperty({
    example: '01000000000',
    description: 'رقم الواتساب للتواصل الفوري',
  })
  @IsString()
  @IsNotEmpty({ message: 'رقم الواتساب مطلوب' })
  whatsappNumber: string;

  @ApiProperty({
    example: '01000000000',
    description: 'رقم الهاتف للاتصال المباشر',
  })
  @IsString()
  @IsNotEmpty({ message: 'رقم الهاتف مطلوب' })
  phoneNumber: string;

  @ApiProperty({ example: true, required: false, default: true })
  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;

  @ApiProperty({ example: false, required: false, default: false })
  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;
}
