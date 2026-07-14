import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    // إعداد الـ Transporter بناءً على الحقول المحددة في الـ .env الفعلي لديك
    this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com', // Gmail SMTP Host القياسي
      port: 587, // بورت STARTTLS
      secure: false, // يجب أن يكون false مع البورت 587 لتفادي خطأ wrong version number
      auth: {
        user: this.configService.get<string>('EMAIL_USER'), // يقرأ EMAIL_USER من ملفك
        pass: this.configService.get<string>('EMAIL_PASS'), // يقرأ EMAIL_PASS من ملفك
      },
      // إجبار البروتوكول على قبول طلبات ترقية التشفير بأمان وتخطي مشاكل الـ Local SSL
      tls: {
        rejectUnauthorized: false,
        ciphers: 'SSLv3',
      },
    });
  }

  /**
   * إرسال بريد إلكتروني عام
   */
  private async sendMail(
    to: string | string[],
    subject: string,
    html: string,
  ): Promise<boolean> {
    // تحديد مرسل البريد تلقائياً من الـ EMAIL_USER المتاح بالـ .env
    const from = this.configService.get<string>('EMAIL_USER');
    const recipient = Array.isArray(to) ? to.join(', ') : to;

    try {
      await this.transporter.sendMail({
        from: `"House Nest Platform" <${from}>`,
        to: recipient,
        subject,
        html,
      });
      this.logger.log(
        `📧 Email sent successfully to ${recipient} with subject: "${subject}"`,
      );
      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `❌ Failed to send email to ${recipient}: ${errorMessage}`,
        errorStack,
      );
      throw new InternalServerErrorException(
        'حدث خطأ أثناء إرسال البريد الإلكتروني، يرجى المحاولة لاحقاً',
      );
    }
  }

  /**
   * 1. إرسال كود الـ OTP للأدمن لتسجيل الدخول
   */
  async sendOtpEmail(adminEmail: string, otpCode: string): Promise<boolean> {
    const subject = '🔒 كود التحقق الثنائي للدخول إلى النظام';
    const html = `
      <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 600px; margin: auto;">
        <h2 style="color: #1e3a8a; border-bottom: 2px solid #f3f4f6; padding-bottom: 10px;">لوحة تحكم House-Nest</h2>
        <p style="font-size: 16px; color: #374151;">مرحباً بك، لقد طلبت تسجيل الدخول إلى لوحة التحكم.</p>
        <p style="font-size: 16px; color: #374151;">الرجاء استخدام كود التحقق (OTP) التالي لإكمال العملية. الكود صالح لمدة 10 دقائق فقط:</p>
        <div style="text-align: center; margin: 30px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #2563eb; background-color: #eff6ff; padding: 10px 30px; border-radius: 5px; border: 1px dashed #2563eb; display: inline-block;">
            ${otpCode}
          </span>
        </div>
        <p style="font-size: 14px; color: #9ca3af; margin-top: 30px; border-top: 1px solid #f3f4f6; padding-top: 15px;">إذا لم تقم بطلب هذا الكود، يرجى تجاهل هذا البريد وتأمين حسابك فوراً.</p>
      </div>
    `;
    return this.sendMail(adminEmail, subject, html);
  }

  /**
   * 2. إرسال إشعار فوري عند تسجيل عميل (Lead) جديد
   */
  async sendAdminNotification(
    to: string | string[],
    subject: string,
    message: string,
    actionUrl?: string,
    actionLabel?: string,
  ): Promise<boolean> {
    const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; padding: 40px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { text-align: center; border-bottom: 2px solid #f0f0f0; padding-bottom: 20px; margin-bottom: 30px; }
          .header h1 { color: #333; font-size: 24px; margin: 0; }
          .content { margin: 30px 0; }
          .button { display: inline-block; background: #007bff; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: 600; margin: 20px 0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #999; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📬 Admin Notification</h1>
          </div>
          <div class="content">
            <p style="font-size: 16px; color: #333;">${message}</p>
            ${
              actionUrl && actionLabel
                ? `
              <div style="text-align: center;">
                <a href="${actionUrl}" class="button" style="color: #ffffff;">${actionLabel}</a>
              </div>
            `
                : ''
            }
          </div>
          <div class="footer">
            <p>This is an automated message from the system.</p>
            <p>&copy; ${new Date().getFullYear()} Your Company. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

    return this.sendMail(to, `📬 ${subject}`, html);
  }

  /**
   * 3. إرسال كود استعادة كلمة المرور للأدمن
   */
  async sendResetPasswordEmail(
    adminEmail: string,
    otpCode: string,
  ): Promise<boolean> {
    const subject = '🔑 كود إعادة تعيين كلمة المرور';
    const html = `
      <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 600px; margin: auto;">
        <h2 style="color: #dc2626; border-bottom: 2px solid #f3f4f6; padding-bottom: 10px;">لوحة تحكم House-Nest</h2>
        <p style="font-size: 16px; color: #374151;">لقد تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك.</p>
        <p style="font-size: 16px; color: #374151;">الرجاء استخدام كود التحقق التالي لإتمام تعيين كلمة المرور الجديدة. هذا الكود صالح لمدة 10 دقائق فقط:</p>
        <div style="text-align: center; margin: 30px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #dc2626; background-color: #fef2f2; padding: 10px 30px; border-radius: 5px; border: 1px dashed #dc2626; display: inline-block;">
            ${otpCode}
          </span>
        </div>
        <p style="font-size: 14px; color: #9ca3af; margin-top: 30px; border-top: 1px solid #f3f4f6; padding-top: 15px;">إذا لم تطلب إعادة تعيين كلمة المرور، يمكنك تجاهل هذا البريد الإلكتروني بأمان.</p>
      </div>
    `;
    return this.sendMail(adminEmail, subject, html);
  }
}
