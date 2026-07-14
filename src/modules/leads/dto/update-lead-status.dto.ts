import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsIn, IsOptional } from 'class-validator';

export class UpdateLeadStatusDto {
  @ApiProperty({
    example: 'قيد التواصل',
    enum: ['جديد', 'قيد التواصل', 'مهتم', 'غير مهتم', 'تم التعاقد'],
  })
  @IsString()
  @IsIn(['جديد', 'قيد التواصل', 'مهتم', 'غير مهتم', 'تم التعاقد'], {
    message: 'حالة العميل غير صالحة',
  })
  status: string;

  @ApiProperty({
    example: 'تم الاتصال بالعميل وسيتم زيارة الموقع الجمعة القادمة',
    required: false,
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
