import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

// استدعاء جميع موديولات النظام المترابطة

@Module({
  imports: [
    // 1. إدارة ملفات البيئة والإعدادات العامة
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV ?? 'development'}`,
    }),

    // 2. الاتصال غير المتزامن بقاعدة بيانات MongoDB المحمية
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
  ],
  controllers: [AppController],
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
