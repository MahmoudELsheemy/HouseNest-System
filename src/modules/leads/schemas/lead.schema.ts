import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Project } from '../../projects/schemas/project.schema';

@Schema({ timestamps: true })
export class Lead extends Document {
  @Prop({ required: true, trim: true })
  fullName: string;

  @Prop({ required: true, trim: true })
  phoneNumber: string;

  @Prop({ required: false, trim: true, lowercase: true })
  email?: string;

  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId: Types.ObjectId | Project; // ربط العميل بالمشروع العقاري المهتم به

  @Prop({
    default: 'جديد',
    enum: ['جديد', 'قيد التواصل', 'مهتم', 'غير مهتم', 'تم التعاقد'],
    index: true,
  })
  status: string; // حالة العميل لمتابعة فريق المبيعات

  @Prop({ default: '', trim: true })
  notes: string; // ملاحظات يضيفها الأدمن/المبيعات حول العميل
}

export const LeadSchema = SchemaFactory.createForClass(Lead);
