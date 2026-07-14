import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Admin } from '../../modules/auth/schemas/admin.schema';

@Injectable()
export class OtpVerifiedGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const admin: Admin = request.user; // تم حقنه بواسطة الـ JwtAuthGuard سابقاً

    if (!admin) {
      throw new UnauthorizedException('يجب تسجيل الدخول أولاً');
    }

    // التحقق من تاريخ آخر تأكيد للـ OTP
    if (!admin.lastOtpVerifiedAt) {
      throw new UnauthorizedException(
        'يرجى إتمام عملية التحقق الثنائي (OTP) أولاً',
      );
    }

    const lastVerified = new Date(admin.lastOtpVerifiedAt).getTime();
    const now = new Date().getTime();

    // جلب عدد أيام الصلاحية من الإعدادات (الافتراضي 7 أيام) وتحويلها إلى Milliseconds
    const revalidationDays = this.configService.get<number>(
      'OTP_REVALIDATION_DAYS',
      7,
    );
    const maxAllowedAge = revalidationDays * 24 * 60 * 60 * 1000;

    // إذا تجاوز الوقت الحالي المدة المسموح بها منذ آخر تأكيد للـ OTP
    if (now - lastVerified > maxAllowedAge) {
      throw new UnauthorizedException(
        `انتهت صلاحية الجلسة الآمنة (${revalidationDays} أيام). يرجى إعادة تسجيل الدخول وتأكيد رمز الـ OTP الجديد`,
      );
    }

    return true;
  }
}
