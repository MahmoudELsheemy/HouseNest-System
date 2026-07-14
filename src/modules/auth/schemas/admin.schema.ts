import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Role } from '../../../common/enums/role.enum';

@Schema({ timestamps: true })
export class Admin extends Document {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true })
  password: string; // bcrypt hashed

  @Prop({ type: String, enum: Role, default: Role.ADMIN })
  role: Role;

  @Prop({ default: null })
  lastOtpVerifiedAt: Date; // آخر تاريخ تم فيه تأكيد كود الـ OTP بنجاح

  @Prop({ default: null })
  lastLoginAt: Date;

  @Prop({ default: true })
  isActive: boolean;
  username: any;
}

export const AdminSchema = SchemaFactory.createForClass(Admin);
