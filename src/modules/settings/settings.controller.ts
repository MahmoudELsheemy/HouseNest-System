import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OtpVerifiedGuard } from '../../common/guards/otp-verified.guard';

@ApiTags('إعدادات المنصة العامة (Settings)')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({
    summary: 'الموقع العام: جلب إعدادات الموقع، قنوات التواصل وحالة الصيانة',
  })
  @ApiResponse({ status: 200, description: 'بيانات إعدادات المنصة الحالية' })
  async getSettings() {
    return this.settingsService.getSettings();
  }

  @Put()
  @UseGuards(JwtAuthGuard, OtpVerifiedGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'الأدمن: تحديث إعدادات المنصة، الهواتف وتفعيل وضع الصيانة',
  })
  @ApiResponse({ status: 200, description: 'تم التحديث بنجاح' })
  async updateSettings(@Body() updateSettingsDto: UpdateSettingsDto) {
    return this.settingsService.updateSettings(updateSettingsDto);
  }
}
