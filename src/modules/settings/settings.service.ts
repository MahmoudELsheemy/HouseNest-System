import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Setting } from './schemas/setting.schema';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { ConfigService } from '@nestjs/config'; // 👈 استيراد ConfigService

@Injectable()
export class SettingsService {
  constructor(
    @InjectModel(Setting.name) private readonly settingModel: Model<Setting>,
    private readonly configService: ConfigService, // 👈 حقن الـ ConfigService ديناميكياً
  ) {}

  /**
   * جلب الإعدادات الحالية (مفتوح للعامة لعرضها في الهيدر والفوتر والـ SEO)
   */
  async getSettings() {
    let settings = await this.settingModel.findOne();

    // إذا لم تكن الإعدادات موجودة في الـ DB بعد، قم بإنشاء السجل الافتراضي الأول ديناميكياً من الـ .env
    if (!settings) {
      settings = new this.settingModel({
        siteName: this.configService.get<string>('SITE_NAME', 'House Nest'),
        siteDescription: this.configService.get<string>(
          'SITE_DESCRIPTION',
          'بوابتك العقارية لإيجاد أفضل المشاريع السكنية والاستثمارية',
        ),
        contactEmail: this.configService.get<string>(
          'ADMIN_EMAIL', // نستخدم الإيميل الأساسي للأدمن كإيميل افتراضي للتواصل
          'ahmedmegahed580@gmail.com',
        ),
        contactPhone: this.configService.get<string>(
          'CONTACT_PHONE',
          '01000000000',
        ),
        whatsappNumber: this.configService.get<string>(
          'WHATSAPP_NUMBER',
          '01000000000',
        ),
        logoUrl: this.configService.get<string>(
          'LOGO_URL',
          'https://res.cloudinary.com/.../logo.png',
        ),
        maintenanceMode: false,
      });

      await settings.save();
    }

    return { data: settings };
  }

  /**
   * تحديث الإعدادات (خاص بالأدمن فقط)
   */
  async updateSettings(updateSettingsDto: UpdateSettingsDto) {
    let settings = await this.settingModel.findOne();

    if (!settings) {
      // في حال عدم وجود الإعدادات (حالة نادرة جداً)، نقوم بدمج الـ DTO مع القيم الافتراضية من الـ .env
      settings = new this.settingModel({
        siteName:
          updateSettingsDto.siteName ??
          this.configService.get<string>('SITE_NAME', 'House Nest'),
        siteDescription:
          updateSettingsDto.siteDescription ??
          this.configService.get<string>('SITE_DESCRIPTION'),
        contactEmail:
          updateSettingsDto.contactEmail ??
          this.configService.get<string>('ADMIN_EMAIL'),
        contactPhone:
          updateSettingsDto.contactPhone ??
          this.configService.get<string>('CONTACT_PHONE'),
        whatsappNumber:
          updateSettingsDto.whatsappNumber ??
          this.configService.get<string>('WHATSAPP_NUMBER'),
        logoUrl:
          updateSettingsDto.logoUrl ??
          this.configService.get<string>('LOGO_URL'),
        maintenanceMode: updateSettingsDto.maintenanceMode ?? false,
      });
    } else {
      Object.assign(settings, updateSettingsDto);
    }

    await settings.save();

    return {
      message: 'تم تحديث إعدادات المنصة العامة بنجاح',
      data: settings,
    };
  }
}
