import { Injectable, OnApplicationBootstrap } from '@nestjs/common'; // 👈 أضفنا OnApplicationBootstrap
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Setting } from './schemas/setting.schema';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SettingsService implements OnApplicationBootstrap {
  constructor(
    @InjectModel(Setting.name) private readonly settingModel: Model<Setting>,
    private readonly configService: ConfigService,
  ) {}

  /**
   * دالة تعمل تلقائياً عند تشغيل السيرفر لمزامنة الإيميل الافتراضي مع الـ .env فوراً
   */
  async onApplicationBootstrap() {
    await this.syncDefaultSettingsWithEnv();
  }

  /**
   * التحقق ومزامنة قيم الـ .env الحالية مع قاعدة البيانات لتفادي ترحيل قيم قديمة
   */
  private async syncDefaultSettingsWithEnv() {
    try {
      const envEmail = this.configService.get<string>('ADMIN_EMAIL');
      if (!envEmail) return;

      let settings = await this.settingModel.findOne();

      if (!settings) {
        // إذا كانت الإعدادات غير موجودة، ننشئها بالقيم الجديدة
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
        console.log(
          `✨ تم إنشاء سجل إعدادات افتراضي جديد بالإيميل: ${envEmail}`,
        );
      } else {
        // ─── الحل السحري ───
        // إذا وجدنا السجل ولكن الإيميل المخزن يختلف عن الإيميل المكتوب بالـ .env الحالي، نقوم بتحديثه فوراً!
        if (
          settings.contactEmail?.toLowerCase().trim() !==
          envEmail.toLowerCase().trim()
        ) {
          settings.contactEmail = envEmail.toLowerCase().trim();
          await settings.save();
          console.log(
            `🔄 تم مزامنة وتحديث إيميل الإشعارات بنجاح إلى: ${envEmail}`,
          );
        }
      }
    } catch (error: any) {
      console.error(
        '❌ حدث خطأ أثناء مزامنة إعدادات المنصة:',
        error?.message || error,
      );
    }
  }

  /**
   * جلب الإعدادات الحالية
   */
  async getSettings() {
    let settings = await this.settingModel.findOne();
    if (!settings) {
      // استدعاء المزامنة يدوياً كحماية إضافية
      await this.syncDefaultSettingsWithEnv();
      settings = await this.settingModel.findOne();
    }
    return { data: settings };
  }

  /**
   * تحديث الإعدادات (خاص بالأدمن فقط)
   */
  async updateSettings(updateSettingsDto: UpdateSettingsDto) {
    let settings = await this.settingModel.findOne();

    if (!settings) {
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
