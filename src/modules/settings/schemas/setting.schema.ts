import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Setting extends Document {
  @Prop({ required: true, default: 'House Nest' })
  siteName: string;

  @Prop({
    default: 'بوابتك العقارية لإيجاد أفضل المشاريع السكنية والاستثمارية',
  })
  siteDescription: string;

  @Prop({ default: 'mahmoudelsheemy164@gmail.com' })
  contactEmail: string;

  @Prop({ default: '01000000000' })
  contactPhone: string;

  @Prop({ default: '01000000000' })
  whatsappNumber: string;

  @Prop({ default: 'https://res.cloudinary.com/.../logo.png' })
  logoUrl: string;

  @Prop({ default: false })
  maintenanceMode: boolean; // تفعيل وضع الصيانة للموقع العام
}

export const SettingSchema = SchemaFactory.createForClass(Setting);
