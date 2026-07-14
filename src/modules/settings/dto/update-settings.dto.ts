import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEmail, IsBoolean } from 'class-validator';

export class UpdateSettingsDto {
  @ApiProperty({ example: 'House Nest Real Estate', required: false })
  @IsString()
  @IsOptional()
  siteName?: string;

  @ApiProperty({
    example: 'ابحث عن عقارك المفضل في أرقى الكمبوندات والمشاريع العقارية',
    required: false,
  })
  @IsString()
  @IsOptional()
  siteDescription?: string;

  @ApiProperty({ example: 'info@house-nest.com', required: false })
  @IsEmail({}, { message: 'البريد الإلكتروني غير صالح' })
  @IsOptional()
  contactEmail?: string;

  @ApiProperty({ example: '01011223344', required: false })
  @IsString()
  @IsOptional()
  contactPhone?: string;

  @ApiProperty({ example: '01011223344', required: false })
  @IsString()
  @IsOptional()
  whatsappNumber?: string;

  @ApiProperty({
    example: 'https://res.cloudinary.com/.../new-logo.png',
    required: false,
  })
  @IsString()
  @IsOptional()
  logoUrl?: string;

  @ApiProperty({ example: false, required: false })
  @IsBoolean()
  @IsOptional()
  maintenanceMode?: boolean;
}
