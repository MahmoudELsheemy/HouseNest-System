import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Lead } from './schemas/lead.schema';
import { Project } from '../projects/schemas/project.schema';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto';
import { MailService } from '../mail/mail.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class LeadsService {
  constructor(
    @InjectModel(Lead.name) private readonly leadModel: Model<Lead>,
    @InjectModel(Project.name) private readonly projectModel: Model<Project>,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * 1. استقبال طلب عميل جديد (عام للزوار) + إرسال إشعار فوري بريدي للأدمن
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

    // ─── إشعار الأدمن فوراً عبر البريد الإلكتروني ───
    try {
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
      // نكتفي بطباعة الخطأ لكي لا تتعطل تجربة الزائر أثناء إرسال بياناته
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
      .populate('projectId', 'name location coverImage') // عمل Populate لاسترجاع بيانات المشروع فوراً
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
}
