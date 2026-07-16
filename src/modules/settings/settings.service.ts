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
   * مزامنة وتحديث قيم قاعدة البيانات مع ملف الـ .env الفعلي
   */
  private async syncDefaultSettingsWithEnv() {
    try {
      // 1. جلب القيم من الـ .env بشكل صارم وبدون قيم احتياطية لمحمود الشيمي داخل الكود
      const envEmail = this.configService.get<string>('ADMIN_EMAIL');

      this.logger.log(
        `🔍 [Config Check] Current ADMIN_EMAIL read from .env is: "${envEmail}"`,
      );

      if (!envEmail) {
        this.logger.error(
          '⚠️ خطأ كاريثي: لم يتم العثور على ADMIN_EMAIL في ملف الـ .env الفعلي الخاص بك!',
        );
        return;
      }

      let settings = await this.settingModel.findOne();

      if (!settings) {
        // إنشاء السجل لأول مرة بالقيم القادمة من الـ .env حصراً
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
          `✨ تم إنشاء سجل إعدادات جديد كلياً بالإيميل الفعلي: ${envEmail}`,
        );
      } else {
        // إذا كان السجل موجوداً والإيميل مختلف عن الـ .env، نقوم بتحديثه فوراً وبقوة
        if (
          settings.contactEmail?.toLowerCase().trim() !==
          envEmail.toLowerCase().trim()
        ) {
          const oldEmail = settings.contactEmail;
          settings.contactEmail = envEmail.toLowerCase().trim();
          await settings.save();
          this.logger.log(
            `🔄 تم تحديث البريد في قاعدة البيانات من [${oldEmail}] إلى [${envEmail}] بنجاح!`,
          );
        } else {
          this.logger.log(
            `🔒 تم التحقق: البريد الحالي في قاعدة البيانات مطابق للـ .env وهو: ${envEmail}`,
          );
        }
      }
    } catch (error: any) {
      this.logger.error(`❌ فشل مزامنة الإعدادات: ${error?.message || error}`);
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
   * تحديث الإعدادات يدوياً
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
