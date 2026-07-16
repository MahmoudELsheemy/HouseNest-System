import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Lead } from './schemas/lead.schema';
import { Project } from '../projects/schemas/project.schema';
import { Setting } from '../settings/schemas/setting.schema'; // 👈 استيراد الـ Setting Schema
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto';
import { MailService } from '../mail/mail.service';
import { ConfigService } from '@nestjs/config';
import * as Workbook from 'exceljs';
import { Response } from 'express';

@Injectable()
export class LeadsService {
  constructor(
    @InjectModel(Lead.name) private readonly leadModel: Model<Lead>,
    @InjectModel(Project.name) private readonly projectModel: Model<Project>,
    @InjectModel(Setting.name) private readonly settingModel: Model<Setting>, // 👈 حقن موديل الإعدادات
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * 1. استقبال طلب عميل جديد (عام للزوار) + إرسال إشعار فوري بريدي للأدمن الفعلي ديناميكياً
   */
  async create(createLeadDto: CreateLeadDto) {
    const { fullName, phoneNumber, email, projectId } = createLeadDto;

    // التأكد من أن المشروع المستهدف موجود بالفعل ونشط
    const project = await this.projectModel.findById(projectId);
    if (!project || !project.isPublished) {
      throw new NotFoundException(
        'المشروع العقاري المحدد غير موجود أو تم إيقافه',
      );
    }

    // حفظ طلب العميل في قاعدة البيانات
    const newLead = new this.leadModel({
      fullName,
      phoneNumber,
      email,
      projectId: new Types.ObjectId(projectId),
    });
    await newLead.save();

    // ─── جلب بريد الأدمن ديناميكياً من قاعدة البيانات ───
    try {
      // البحث عن أول سجل إعدادات في الـ Database
      // const settings = await this.settingModel.findOne();

      // إذا كانت الإعدادات موجودة نأخذ الإيميل منها، وإلا نرجع للـ .env كحل احتياطي (Fallback)
      const adminEmail = this.configService.get<string>('ADMIN_EMAIL');

      if (adminEmail) {
        const subject = `🔥 عميل جديد مهتم بـ: ${project.name}`;
        const message = `
    لقد تلقيت طلباً جديداً من أحد العملاء المهتمين بمشروعك العقاري:
    <br><br>
    <b>👤 الاسم الكامل:</b> ${fullName}<br>
    <b>📞 رقم الهاتف:</b> ${phoneNumber}<br>
    <b>📧 البريد الإلكتروني:</b> ${email || 'غير متوفر'}<br>
    <b>🏢 المشروع المهتم به:</b> ${project.name}<br>
    <b>📍 موقع المشروع:</b> ${project.location}
  `;
        await this.mailService.sendAdminNotification(
          adminEmail,
          subject,
          message,
        );
      }
    } catch (mailError) {
      console.error(
        '⚠️ فشل إرسال إشعار بريدي للأدمن بالعميل الجديد:',
        mailError,
      );
    }

    return {
      success: true,
      message: 'تم استقبال طلبك بنجاح، وسيقوم فريق المبيعات بالتواصل معك فوراً',
    };
  }

  /**
   * 2. جلب جميع العملاء (للأدمن فقط) مع عرض تفاصيل المشروع تلقائياً
   */
  async findAllForAdmin() {
    const leads = await this.leadModel
      .find()
      .populate('projectId', 'name location coverImage')
      .sort({ createdAt: -1 });
    return { data: leads };
  }

  /**
   * 3. تحديث حالة العميل وملاحظاته (للأدمن فقط)
   */
  async updateStatus(id: string, updateLeadStatusDto: UpdateLeadStatusDto) {
    const lead = await this.leadModel.findById(id);
    if (!lead) {
      throw new NotFoundException('العميل المطلوب غير موجود');
    }

    lead.status = updateLeadStatusDto.status;
    if (updateLeadStatusDto.notes !== undefined) {
      lead.notes = updateLeadStatusDto.notes;
    }

    await lead.save();

    return {
      message: 'تم تحديث حالة العميل بنجاح',
      data: lead,
    };
  }

  /**
   * 4. حذف عميل نهائياً (للأدمن فقط)
   */
  async remove(id: string) {
    const lead = await this.leadModel.findByIdAndDelete(id);
    if (!lead) {
      throw new NotFoundException('العميل المطلوب غير موجود بالفعل');
    }
    return {
      message: 'تم حذف بيانات العميل بنجاح من النظام',
    };
  }

  /**
   * تصدير البيانات إلى Excel
   */
  async exportLeadsToExcel(res: Response) {
    const leads = await this.leadModel
      .find()
      .populate('projectId', 'name location')
      .sort({ createdAt: -1 });

    const workbook = new Workbook.Workbook();
    const worksheet = workbook.addWorksheet('قائمة العملاء المهتمين');

    worksheet.columns = [
      { header: '#', key: 'index', width: 8 },
      { header: 'الاسم الكامل', key: 'fullName', width: 25 },
      { header: 'رقم الهاتف', key: 'phoneNumber', width: 18 },
      { header: 'البريد الإلكتروني', key: 'email', width: 25 },
      { header: 'المشروع المهتم به', key: 'projectName', width: 25 },
      { header: 'موقع المشروع', key: 'projectLocation', width: 20 },
      { header: 'حالة العميل', key: 'status', width: 15 },
      { header: 'الملاحظات', key: 'notes', width: 30 },
      { header: 'تاريخ التسجيل', key: 'createdAt', width: 20 },
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' }, size: 12 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '1E3A8A' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    leads.forEach((lead, index) => {
      const project = lead.projectId as any;

      const row = worksheet.addRow({
        index: index + 1,
        fullName: lead.fullName,
        phoneNumber: lead.phoneNumber,
        email: lead.email || 'غير متوفر',
        projectName: project ? project.name : 'مشروع محذوف',
        projectLocation: project ? project.location : '-',
        status: lead.status,
        notes: lead.notes || '-',
        createdAt: new Date((lead as any).createdAt).toLocaleString('ar-EG'),
      });

      row.alignment = { vertical: 'middle', horizontal: 'right' };
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=HouseNest_Leads_${Date.now()}.xlsx`,
    );

    await workbook.xlsx.write(res);
    res.end();
  }
}
