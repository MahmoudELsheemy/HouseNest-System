import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Res } from '@nestjs/common';
import type { Response } from 'express';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OtpVerifiedGuard } from '../../common/guards/otp-verified.guard';

@ApiTags('إدارة طلبات العملاء (Leads)')
@Controller()
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  // ─── مسار عام مفتوح للزوار في الموقع الرئيسي ───
  @Post('leads')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'الموقع العام: تسجيل بيانات عميل مهتم بمشروع عقاري معين',
  })
  @ApiResponse({ status: 201, description: 'تم استقبال بيانات العميل بنجاح' })
  async submitLead(@Body() createLeadDto: CreateLeadDto) {
    return this.leadsService.create(createLeadDto);
  }

  // ─── مسارات الإدارة المحمية للـ Dashboard ───

  @Get('admin/leads')
  @UseGuards(JwtAuthGuard, OtpVerifiedGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'الأدمن: جلب قائمة كافة طلبات العملاء والمهتمين ومتابعتهم',
  })
  async getAdminLeads() {
    return this.leadsService.findAllForAdmin();
  }

  @Put('admin/leads/:id/status')
  @UseGuards(JwtAuthGuard, OtpVerifiedGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary:
      'الأدمن: تحديث حالة العميل (مثال: من جديد إلى قيد التواصل) وكتابة الملاحظات',
  })
  async updateLeadStatus(
    @Param('id') id: string,
    @Body() updateLeadStatusDto: UpdateLeadStatusDto,
  ) {
    return this.leadsService.updateStatus(id, updateLeadStatusDto);
  }

  @Delete('admin/leads/:id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, OtpVerifiedGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'الأدمن: حذف بيانات العميل نهائياً من قاعدة البيانات',
  })
  async deleteLead(@Param('id') id: string) {
    return this.leadsService.remove(id);
  }

  @Get('admin/leads/export/excel')
  @UseGuards(JwtAuthGuard, OtpVerifiedGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'الأدمن: تصدير كافة بيانات العملاء والمهتمين إلى ملف Excel',
  })
  async exportLeadsToExcel(@Res() res: Response) {
    return this.leadsService.exportLeadsToExcel(res);
  }
}
