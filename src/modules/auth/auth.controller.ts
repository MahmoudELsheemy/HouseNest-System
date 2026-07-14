import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OtpVerifiedGuard } from '../../common/guards/otp-verified.guard';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgetPasswordDto } from './dto/forget-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@ApiTags('المصادقة والأمان (Auth)')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'تسجيل الدخول الأولي (إيميل وباسورد) -> يرسل كود الـ OTP للبريد الإلكتروني',
  })
  @ApiResponse({
    status: 200,
    description:
      'تم إرسال كود الـ OTP بنجاح، يرجع tempToken لاستخدامه في الخطوة التالية',
  })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'تأكيد كود الـ OTP -> يرجع الـ Tokens النهائية للجلسة',
  })
  @ApiResponse({ status: 200, description: 'تم التحقق بنجاح وإصدار الجلسة' })
  async verifyOtp(@Body() verifyOtpDto: VerifyOtpDto) {
    return this.authService.verifyOtp(verifyOtpDto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'تجديد صلاحية الجلسة (إصدار Access Token جديد دون تسجيل خروج)',
  })
  @ApiResponse({ status: 200, description: 'تم تجديد التوكنات بنجاح' })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshTokens(refreshTokenDto.refreshToken);
  }

  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'إعادة إرسال كود الـ OTP في حال عدم وصوله' })
  @ApiResponse({
    status: 200,
    description: 'تم إعادة إرسال الكود وتحديث الـ tempToken',
  })
  async resendOtp(@Body() resendOtpDto: ResendOtpDto) {
    return this.authService.resendOtp(resendOtpDto);
  }

  @Post('forget-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'طلب استعادة كلمة المرور (Forget Password) عند نسيانها',
  })
  @ApiResponse({
    status: 200,
    description: 'تم إرسال كود الاستعادة للإيميل وإرجاع tempToken',
  })
  async forgetPassword(@Body() forgetPasswordDto: ForgetPasswordDto) {
    return this.authService.forgetPassword(forgetPasswordDto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'تعيين كلمة المرور الجديدة باستخدام كود الـ OTP والـ tempToken',
  })
  @ApiResponse({ status: 200, description: 'تم تحديث كلمة المرور بنجاح' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, OtpVerifiedGuard) // حماية مزدوجة: توكن صالح + لم يمر 7 أيام على الـ OTP
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'جلب بيانات الأدمن الحالي صاحب الجلسة النشطة' })
  @ApiResponse({ status: 200, description: 'بيانات الأدمن المسترجعة' })
  async getMe(@Req() req) {
    // req.user يحتوي على بيانات الأدمن بعد فك الـ JWT وتمرير الـ Guards
    return this.authService.getAdminInfo(req.user._id);
  }
}
