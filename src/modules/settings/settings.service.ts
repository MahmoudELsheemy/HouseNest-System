import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Setting } from './schemas/setting.schema';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SettingsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SettingsService.name);

  constructor(
    @InjectModel(Setting.name) private readonly settingModel: Model<Setting>,
    private readonly configService: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    await this.syncDefaultSettingsWithEnv();
  }

  /**
   * تهيئة إعدادات المنصة الافتراضية من الـ .env عند تشغيل النظام لأول مرة فقط
   */
  private async syncDefaultSettingsWithEnv() {
    try {
      const envEmail = this.configService.get<string>('ADMIN_EMAIL');

      if (!envEmail) {
        this.logger.error(
          '⚠️ تحذير: لم يتم العثور على ADMIN_EMAIL في ملف الـ .env.development الخاص بك!',
        );
        return;
      }

      let settings = await this.settingModel.findOne();

      // ─── التعديل المصلح ───
      // نقوم بالإنشاء فقط إذا كانت قاعدة البيانات خالية تماماً من الإعدادات
      if (!settings) {
        settings = new this.settingModel({
          siteName: this.configService.get<string>('SITE_NAME', 'House Nest'),
          siteDescription: this.configService.get<string>(
            'SITE_DESCRIPTION',
            'بوابتك العقارية لإيجاد أفضل المشاريع السكنية والاستثمارية',
          ),
          contactEmail: envEmail.toLowerCase().trim(),
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
        this.logger.log(
          `✨ تم إنشاء سجل الإعدادات الافتراضي لأول مرة بالإيميل: ${envEmail}`,
        );
      } else {
        // إذا كان السجل موجوداً مسبقاً، لا نقوم بمزامنة أو مسح الإيميل الذي عدله الأدمن يدوياً
        this.logger.log(
          `🔒 تم التحقق: سجل الإعدادات موجود ومستقر بالفعل في قاعدة البيانات.`,
        );
      }
    } catch (error: any) {
      this.logger.error(
        `❌ فشل تهيئة الإعدادات الافتراضية: ${error?.message || error}`,
      );
    }
  }

  /**
   * جلب الإعدادات الحالية
   */
  async getSettings() {
    let settings = await this.settingModel.findOne();
    if (!settings) {
      await this.syncDefaultSettingsWithEnv();
      settings = await this.settingModel.findOne();
    }
    return { data: settings };
  }

  /**
   * تحديث الإعدادات يدوياً (خاص بالأدمن فقط من الـ Swagger أو الـ Dashboard)
   */
  async updateSettings(updateSettingsDto: UpdateSettingsDto) {
    let settings = await this.settingModel.findOne();

    if (!settings) {
      const envEmail = this.configService.get<string>(
        'ADMIN_EMAIL',
        'alshymyhwdh@gmail.com',
      );
      settings = new this.settingModel({
        siteName:
          updateSettingsDto.siteName ??
          this.configService.get<string>('SITE_NAME', 'House Nest'),
        siteDescription:
          updateSettingsDto.siteDescription ??
          this.configService.get<string>('SITE_DESCRIPTION'),
        contactEmail:
          updateSettingsDto.contactEmail ?? envEmail.toLowerCase().trim(),
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
