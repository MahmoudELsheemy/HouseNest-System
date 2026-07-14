import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Otp extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Admin', required: true })
  adminId: Types.ObjectId;

  @Prop({ required: true })
  code: string; // كود الـ OTP المكون من 6 أرقام

  @Prop({ required: true })
  expiresAt: Date; // تاريخ الانتهاء

  @Prop({ default: false })
  isUsed: boolean;

  @Prop({ default: 0 })
  attempts: number; // لحساب المحاولات الخاطئة ومنع الـ Brute Force
}

export const OtpSchema = SchemaFactory.createForClass(Otp);

// إعداد TTL Index ليقوم MongoDB بحذف الـ Document تلقائياً بعد مرور وقت انتهاء الصلاحية
OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
