import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler'; // 👈 استيراد Throttler
import { APP_GUARD } from '@nestjs/core';

import { MailModule } from './modules/mail/mail.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { UploadModule } from './modules/upload/upload.module';
import { LeadsModule } from './modules/leads/leads.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { SettingsModule } from './modules/settings/settings.module';

@Module({
  imports: [
    // 1. إدارة ملفات البيئة والإعدادات العامة
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV ?? 'development'}`,
    }),

    // 2. الاتصال غير المتزامن بقاعدة بيانات MongoDB
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const uri = config.get<string>('MONGO_URI');
        if (!uri) throw new Error('MONGO_URI is not defined');
        return {
          uri,
          tls: true,
          serverSelectionTimeoutMS: 10000,
          connectTimeoutMS: 10000,
          socketTimeoutMS: 45000,
          maxPoolSize: 10,
          minPoolSize: 0,
          bufferCommands: false,
          heartbeatFrequencyMS: 30000,
        };
      },
    }),

    // 3. درع الحماية ضد الـ Brute Force والـ DDOS (يسمح بـ 60 طلب كحد أقصى لكل دقيقة لكل IP)
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // دقيقة واحدة بالملي ثانية
        limit: 60, // عدد الطلبات المسموح بها
      },
    ]),

    MailModule,
    AuthModule,
    ProjectsModule,
    UploadModule,
    LeadsModule,
    DashboardModule,
    SettingsModule,
  ],
  controllers: [AppController],
  providers: [
    // تفعيل درع الحماية عالمياً على مستوى التطبيق بالكامل
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}

//npm install @nestjs/mongoose mongoose

// npm install @nestjs/config

// npm install @nestjs/jwt
// npm install @nestjs/passport
// npm install passport
// npm install passport-jwt

// npm install bcrypt

// npm install class-validator
// npm install class-transformer

//npm install nodemailer
// npm install --save-dev @types/nodemailer

//npm install cloudinary multer
// npm install --save-dev @types/multer
