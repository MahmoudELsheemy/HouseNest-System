import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

import { Admin } from './schemas/admin.schema';
import { Otp } from './schemas/otp.schema';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { MailService } from '../mail/mail.service';
import { generateOtp, getOtpExpiry } from '../../common/utils/otp.util';
import { ForgetPasswordDto } from './dto/forget-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(Admin.name) private adminModel: Model<Admin>,
    @InjectModel(Otp.name) private otpModel: Model<Otp>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private mailService: MailService,
  ) {}

  /**
   * الخطوة الأولى: تسجيل الدخول بالإيميل والباسورد -> إرسال OTP
   */
  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // البحث عن الأدمن
    const admin = await this.adminModel.findOne({ email });
    if (!admin || !admin.isActive) {
      throw new UnauthorizedException(
        'بيانات الاعتماد غير صحيحة أو الحساب غير نشط',
      );
    }

    // التحقق من كلمة المرور
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('بيانات الاعتماد غير صحيحة');
    }

    // توليد وإرسال الـ OTP
    const tempToken = await this.generateAndSendOtp(admin);

    return {
      message: 'تم إرسال كود التحقق إلى بريدك الإلكتروني بنجاح',
      data: {
        requiresOtp: true,
        tempToken,
      },
    };
  }

  /**
   * دالة مساعدة لتوليد وحفظ وإرسال الـ OTP
   */
  private async generateAndSendOtp(admin: Admin): Promise<string> {
    const code = generateOtp();
    const expiresAt = getOtpExpiry(10); // صالح لـ 10 دقائق

    // حذف أي أكواد قديمة غير مستخدمة لهذا الأدمن لتجنب تراكمها
    await this.otpModel.deleteMany({ adminId: admin._id, isUsed: false });

    // حفظ الـ OTP الجديد في قاعدة البيانات
    await this.otpModel.create({
      adminId: admin._id,
      code,
      expiresAt,
    });

    // إرسال الإيميل الفعلي
    await this.mailService.sendOtpEmail(admin.email, code);

    // توليد توكن مؤقت مشفر يحمل الآيدي الخاص بالأدمن وصالح لـ 10 دقائق فقط لإتمام خطوة الـ OTP
    return this.jwtService.sign(
      { sub: admin._id.toString(), purpose: 'otp_verification' },
      {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: '10m',
      },
    );
  }

  /**
   * الخطوة الثانية: تأكيد كود الـ OTP وإصدار التوكنات النهائية للجلسة
   */
  async verifyOtp(verifyOtpDto: VerifyOtpDto) {
    const { tempToken, code } = verifyOtpDto;
    let payload: any;

    // 1. فك وتأكيد الـ tempToken المؤقت
    try {
      payload = this.jwtService.verify(tempToken, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      });
    } catch (e) {
      throw new BadRequestException(
        'التوكن المؤقت غير صالح أو منتهي الصلاحية، يرجى إعادة تسجيل الدخول',
      );
    }

    // تحقق دفاعي للتأكد من سلامة الـ payload والـ sub
    if (!payload || !payload.sub || payload.purpose !== 'otp_verification') {
      throw new BadRequestException(
        'محتوى التوكن غير صالح أو تالف، يرجى إعادة تسجيل الدخول',
      );
    }

    const adminId = payload.sub;

    // جلب بيانات الأدمن بالكامل والتأكد من وجوده ونشاطه
    const admin = await this.adminModel.findById(adminId);
    if (!admin || !admin.isActive) {
      throw new BadRequestException('حساب المسؤول غير موجود أو تم إيقافه');
    }

    // 2. البحث عن الكود في قاعدة البيانات
    const otpRecord = await this.otpModel.findOne({
      adminId: new Types.ObjectId(adminId),
      isUsed: false,
    });

    if (!otpRecord) {
      throw new BadRequestException(
        'كود التحقق غير صالح أو تم استخدامه مسبقاً، يرجى طلب كود جديد',
      );
    }

    // التحقق من انتهاء الصلاحية يدوياً
    if (new Date() > otpRecord.expiresAt) {
      throw new BadRequestException(
        'كود التحقق منتهي الصلاحية، يرجى طلب كود جديد',
      );
    }

    // منع محاولات التخمين (Brute Force)
    if (otpRecord.attempts >= 5) {
      await otpRecord.deleteOne();
      throw new BadRequestException(
        'تم تجاوز الحد الأقصى للمحاولات الخاطئة، يرجى طلب كود جديد',
      );
    }

    // 3. مطابقة الكود المرسل
    if (otpRecord.code !== code.trim()) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      throw new BadRequestException(
        `كود التحقق غير صحيح، المحاولات المتبقية: ${5 - otpRecord.attempts}`,
      );
    }

    // 4. الكود صحيح! تحديث السجلات
    otpRecord.isUsed = true;
    await otpRecord.save();

    const now = new Date();
    admin.lastOtpVerifiedAt = now;
    admin.lastLoginAt = now;
    await admin.save();

    // 5. إصدار التوكنات النهائية بتمرير كائن الأدمن كاملاً بشكل صحيح للـ Payload
    const tokens = await this.generateTokens(admin);

    return {
      message: 'تم تسجيل الدخول بنجاح',
      data: tokens,
    };
  }

  /**
   * تجديد الـ Access Token باستخدام الـ Refresh Token الصالح
   */
  async refreshTokens(refreshToken: string) {
    let payload: any;

    // 1. التحقق من صحة وصلاحية الـ Refresh Token تشفيرياً
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret:
          this.configService.get<string>('JWT_REFRESH_SECRET') ||
          this.configService.get<string>('JWT_ACCESS_SECRET'),
      });
    } catch (e) {
      throw new UnauthorizedException(
        'انتهت صلاحية الجلسة، يرجى إعادة تسجيل الدخول',
      );
    }

    // 2. التحقق من أن الـ payload يحتوي على الـ sub (ID المسؤول)
    if (!payload || !payload.sub) {
      throw new UnauthorizedException(
        'جلسة غير صالحة، يرجى إعادة تسجيل الدخول',
      );
    }

    // 3. جلب بيانات الأدمن للتأكد من أنه لا يزال نشطاً ولم يتم حظره
    const admin = await this.adminModel.findById(payload.sub);
    if (!admin || !admin.isActive) {
      throw new UnauthorizedException('حساب المسؤول غير موجود أو تم إيقافه');
    }

    // 4. التحقق من شرط الـ 7 أيام الخاص بالـ OTP لحماية الـ Session
    if (!admin.lastOtpVerifiedAt) {
      throw new UnauthorizedException('يرجى تأكيد كود الـ OTP أولاً');
    }

    const lastVerified = new Date(admin.lastOtpVerifiedAt).getTime();
    const now = new Date().getTime();
    const revalidationDays = this.configService.get<number>(
      'OTP_REVALIDATION_DAYS',
      7,
    );
    const maxAllowedAge = revalidationDays * 24 * 60 * 60 * 1000;

    if (now - lastVerified > maxAllowedAge) {
      throw new UnauthorizedException(
        `انتهت صلاحية الجلسة الأمنية (${revalidationDays} أيام). يرجى إعادة تسجيل الدخول بالـ OTP`,
      );
    }

    // 5. توليد توكنات جديدة بالكامل وإرجاعها
    const tokens = await this.generateTokens(admin);

    return {
      message: 'تم تجديد الجلسة بنجاح',
      data: tokens,
    };
  }

  /**
   * إعادة إرسال كود الـ OTP في حال عدم وصوله
   */
  async resendOtp(resendOtpDto: ResendOtpDto) {
    const { tempToken } = resendOtpDto;
    let payload: any;

    try {
      payload = this.jwtService.verify(tempToken, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      });
    } catch (e) {
      throw new BadRequestException('التوكن المؤقت غير صالح أو منتهي الصلاحية');
    }

    if (!payload || !payload.sub) {
      throw new BadRequestException('بيانات التوكن غير صالحة');
    }

    const admin = await this.adminModel.findById(payload.sub);
    if (!admin || !admin.isActive) {
      throw new NotFoundException('حساب المسؤول غير موجود أو تم إيقافه');
    }

    const newTempToken = await this.generateAndSendOtp(admin);

    return {
      message: 'تم إعادة إرسال كود التحقق الجديد بنجاح',
      data: { tempToken: newTempToken },
    };
  }

  /**
   * دالة مساعدة لتوليد الـ Tokens النهائية للـ Session
   */
  private async generateTokens(admin: Admin) {
    const payload = {
      sub: admin._id.toString(),
      email: admin.email,
      role: admin.role,
    };

    // Access token - صلاحية ساعة واحدة
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.configService.get<string>(
        'JWT_ACCESS_EXPIRES',
        '1h',
      ) as any,
    });

    // Refresh token - صلاحية 7 أيام
    const refreshToken = this.jwtService.sign(payload, {
      secret:
        this.configService.get<string>('JWT_REFRESH_SECRET') ||
        this.configService.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.configService.get<string>(
        'JWT_REFRESH_EXPIRES',
        '7d',
      ) as any,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 3600, // 1 hour in seconds
    };
  }

  /**
   * طلب استعادة كلمة المرور -> إرسال OTP مخصص للاستعادة
   */
  async forgetPassword(forgetPasswordDto: ForgetPasswordDto) {
    const { email } = forgetPasswordDto;

    // 1. التأكد من وجود الحساب ونشاطه
    const admin = await this.adminModel.findOne({ email });
    if (!admin || !admin.isActive) {
      throw new NotFoundException(
        'البريد الإلكتروني المدخل غير مسجل لدينا أو الحساب غير نشط',
      );
    }

    // 2. توليد وحفظ كود الـ OTP الخاص بالاستعادة
    const code = generateOtp();
    const expiresAt = getOtpExpiry(10); // صالح لـ 10 دقائق

    // حذف أي أكواد استعادة أو دخول معلقة لهذا الأدمن
    await this.otpModel.deleteMany({ adminId: admin._id, isUsed: false });

    await this.otpModel.create({
      adminId: admin._id,
      code,
      expiresAt,
    });

    // 3. إرسال بريد الاستعادة المخصص
    await this.mailService.sendResetPasswordEmail(admin.email, code);

    // 4. توليد توكن مؤقت مخصص لغرض إعادة التعيين لمنع التلاعب بالروتس
    const tempToken = this.jwtService.sign(
      { sub: admin._id.toString(), purpose: 'password_reset' },
      {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: '10m',
      },
    );

    return {
      message: 'تم إرسال كود استعادة كلمة المرور إلى بريدك الإلكتروني بنجاح',
      data: {
        tempToken,
      },
    };
  }

  /**
   * إعادة تعيين كلمة المرور وتحديثها في قاعدة البيانات
   */
  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { tempToken, code, newPassword } = resetPasswordDto;
    let payload: any;

    // 1. فك وتأكيد التوكن المؤقت الخاص بالاستعادة
    try {
      payload = this.jwtService.verify(tempToken, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      });
    } catch (e) {
      throw new BadRequestException(
        'طلب الاستعادة منتهي الصلاحية أو غير صالح، يرجى البدء من جديد',
      );
    }

    // تأكيد أن التوكن مخصص لغرض إعادة تعيين كلمة المرور فقط
    if (!payload || !payload.sub || payload.purpose !== 'password_reset') {
      throw new BadRequestException('طلب تعيين كلمة مرور غير صالح');
    }

    const adminId = payload.sub;

    // 2. التحقق من صحة الكود في قاعدة البيانات
    const otpRecord = await this.otpModel.findOne({
      adminId: new Types.ObjectId(adminId),
      isUsed: false,
    });

    if (!otpRecord) {
      throw new BadRequestException(
        'كود التحقق غير صالح أو تم استخدامه مسبقاً',
      );
    }

    if (new Date() > otpRecord.expiresAt) {
      throw new BadRequestException(
        'كود التحقق منتهي الصلاحية، يرجى طلب كود جديد',
      );
    }

    if (otpRecord.code !== code.trim()) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      throw new BadRequestException('كود التحقق غير صحيح');
    }

    // 3. تشفير كلمة المرور الجديدة
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // 4. تحديث كلمة المرور في قاعدة البيانات وتصفير حقول الـ OTP
    await this.adminModel.findByIdAndUpdate(adminId, {
      password: hashedPassword,
      lastOtpVerifiedAt: null, // إجبار الأدمن على تسجيل الدخول الكلي مع OTP من جديد لزيادة الأمان
    });

    // وسم كود الـ OTP كمستخدم لتدميره
    otpRecord.isUsed = true;
    await otpRecord.save();

    return {
      message:
        'تم إعادة تعيين كلمة المرور بنجاح، يمكنك تسجيل الدخول الآن ببياناتك الجديدة',
    };
  }
  /**
   * جلب بيانات الحساب الحالي (Me)
   */
  async getAdminInfo(adminId: string) {
    const admin = await this.adminModel.findById(adminId).select('-password');
    if (!admin) throw new NotFoundException('المسؤول غير موجود');
    return { data: admin };
  }
}
