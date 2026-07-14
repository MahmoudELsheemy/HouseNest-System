import * as mongoose from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import { AdminSchema } from '../../modules/auth/schemas/admin.schema';
import { Role } from '../../common/enums/role.enum';

// تحميل ملف البيئة ديناميكياً بناءً على NODE_ENV
dotenv.config({
  path: `.env.${process.env.NODE_ENV ?? 'development'}`,
});

async function seed() {
  const uri = process.env.MONGO_URI;
  // استخدام المتغيرات المعرفة في ملف الـ .env.development الخاص بك
  const email = process.env.ADMIN_EMAIL || 'admin@house-nest.com';
  const password = process.env.ADMIN_PASSWORD || '12345678';

  if (!uri) {
    throw new Error('❌ MONGO_URI is not defined in environment variables');
  }

  console.log('⏳ Connecting to MongoDB...');
  // تفعيل الاتصال بقاعدة البيانات مع إعدادات الأمان
  await mongoose.connect(uri, {
    tls: true,
  } as mongoose.ConnectOptions);

  console.log('✅ Connected to MongoDB successfully');

  // ربط الموديل بكولكشن الـ admins الفعلي للسيستم بناءً على الـ AdminSchema
  const AdminModel = mongoose.model('Admin', AdminSchema, 'admins');

  // التحقق من وجود حساب أدمن مسجل مسبقاً بنفس البريد الإلكتروني لحماية البيانات
  const existingAdmin = await AdminModel.findOne({
    email: email.toLowerCase().trim(),
  });

  if (existingAdmin) {
    console.log(
      '⚠️ Admin Account already exists in the database. Seed aborted.',
    );
    await mongoose.disconnect();
    return;
  }

  // تشفير كلمة المرور بقوة 12 جولة (أكثر أماناً)
  const hashedPassword = await bcrypt.hash(password, 12);

  // إنشاء حساب المسؤول الأساسي بالحقول المطابقة تماماً للـ AdminSchema
  await AdminModel.create({
    email: email.toLowerCase().trim(),
    password: hashedPassword,
    role: Role.ADMIN, // استخدام الـ Enum الخاص بك
    isActive: true,
    lastOtpVerifiedAt: undefined,
    lastLoginAt: undefined,
  });

  console.log('===================================================');
  console.log('✅ Global System Admin Created Successfully!');
  console.log(`📧 Email: ${email}`);
  console.log('🔑 Password: [SECURED FROM ENV]');
  console.log(
    '⚠️ Please ensure to clear credentials from ENV if in production!',
  );
  console.log('===================================================');

  await mongoose.disconnect();
  console.log('🔌 Disconnected from MongoDB');
}

seed().catch((err) => {
  console.error('❌ Seed execution failed:', err);
  process.exit(1);
});

//npx ts-node src/database/seeds/owner.seed.ts