import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Setting } from './schemas/setting.schema';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class SettingsService {
  constructor(
    @InjectModel(Setting.name) private readonly settingModel: Model<Setting>,
  ) {}

  /**
   * جلب الإعدادات الحالية (مفتوح للعامة لعرضها في الهيدر والفوتر والـ SEO)
   */
  async getSettings() {
    let settings = await this.settingModel.findOne();

    // إذا لم تكن الإعدادات موجودة في الـ DB بعد، قم بإنشاء السجل الافتراضي الأول
    if (!settings) {
      settings = new this.settingModel();
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
      settings = new this.settingModel(updateSettingsDto);
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
