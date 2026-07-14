import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Admin } from '../schemas/admin.schema';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    @InjectModel(Admin.name) private adminModel: Model<Admin>,
  ) {
    const jwtSecret = configService.get<string>('JWT_ACCESS_SECRET');

    // التحقق من وجود الـ Secret لمنع انهيار السيرفر برسالة غامضة
    if (!jwtSecret) {
      throw new Error(
        'عذراً: JWT_ACCESS_SECRET غير معرف في متغيرات البيئة (.env)',
      );
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret, // تمرير القيمة المحققة والمضمونة
    });
  }

  async validate(payload: { sub: string }) {
    const admin = await this.adminModel
      .findById(payload.sub)
      .select('-password');

    if (!admin || !admin.isActive) {
      throw new UnauthorizedException('حساب المسؤول غير موجود أو تم إيقافه');
    }

    return admin;
  }
}
