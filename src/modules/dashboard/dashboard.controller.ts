import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OtpVerifiedGuard } from '../../common/guards/otp-verified.guard';

@ApiTags('إحصائيات لوحة التحكم (Dashboard)')
@Controller('admin/dashboard')
@UseGuards(JwtAuthGuard, OtpVerifiedGuard) // تأمين المسار بـ JWT والتحقق الثنائي OTP
@ApiBearerAuth('access-token')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @ApiOperation({
    summary: 'الأدمن: جلب إحصائيات عامة وتحليلات مفصلة للوحة التحكم',
  })
  @ApiResponse({
    status: 200,
    description: 'تم جلب التحليلات والإحصائيات بنجاح',
  })
  async getDashboardStats() {
    return this.dashboardService.getStats();
  }
}
