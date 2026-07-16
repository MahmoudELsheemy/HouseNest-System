import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';
import { Lead, LeadSchema } from './schemas/lead.schema';
import { Project, ProjectSchema } from '../projects/schemas/project.schema';
import { Setting, SettingSchema } from '../settings/schemas/setting.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Lead.name, schema: LeadSchema },
      { name: Project.name, schema: ProjectSchema },
      { name: Setting.name, schema: SettingSchema }, // 👈 أضف الـ Setting هنا // قمنا بإدراج ProjectSchema للتحقق من وجود المشاريع
    ]),
  ],
  controllers: [LeadsController],
  providers: [LeadsService],
  exports: [LeadsService], // تصدير لخدمة الإحصائيات لاحقاً
})
export class LeadsModule {}
