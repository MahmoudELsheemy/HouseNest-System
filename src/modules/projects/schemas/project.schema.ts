import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import slugify from 'slugify';

@Schema({ timestamps: true })
export class Project extends Document {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ unique: true, index: true })
  slug: string;

  @Prop({ required: true, trim: true })
  location: string;

  @Prop({ required: true, trim: true })
  shortDescription: string;

  @Prop({ default: '' })
  fullDescription: string;

  @Prop({ default: '' })
  coverImage: string; // رابط الصورة الرئيسية للمشروع

  @Prop({ type: [String], default: [] })
  gallery: string[]; // معرض الصور الإضافية للمشروع

  @Prop({ type: [String], default: [] })
  amenities: string[]; // المميزات والخدمات (مثال: حمام سباحة، حراسة، إلخ)

  @Prop({ default: '' })
  googleMapsUrl: string;

  @Prop({ required: true, trim: true })
  whatsappNumber: string;

  @Prop({ required: true, trim: true })
  phoneNumber: string;

  @Prop({ default: true, index: true })
  isPublished: boolean; // نشر أو إخفاء المشروع عن العامة

  @Prop({ default: false, index: true })
  isFeatured: boolean; // تمييز المشروع ليظهر في الـ Landing Page
}

export const ProjectSchema = SchemaFactory.createForClass(Project);

// تفعيل وتوحيد منطق تكوين الـ Slug العربي المقروء والداعم للـ SEO
ProjectSchema.pre('save', function (this: any) {
  if (this.isModified('name')) {
    this.slug = slugify(this.name, {
      lower: true,
      strict: true,
      trim: true,
    });
  }
});
