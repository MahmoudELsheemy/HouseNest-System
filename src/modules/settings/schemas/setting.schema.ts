import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Setting extends Document {
  @Prop({ required: true })
  siteName: string;

  @Prop()
  siteDescription: string;

  @Prop()
  contactEmail: string;

  @Prop()
  contactPhone: string;

  @Prop()
  whatsappNumber: string;

  @Prop()
  logoUrl: string;

  @Prop({ default: false })
  maintenanceMode: boolean; // تفعيل وضع الصيانة للموقع العام
}

export const SettingSchema = SchemaFactory.createForClass(Setting);
