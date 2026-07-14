import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Project } from '../projects/schemas/project.schema';
import { Lead } from '../leads/schemas/lead.schema';

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(Project.name) private readonly projectModel: Model<Project>,
    @InjectModel(Lead.name) private readonly leadModel: Model<Lead>,
  ) {}

  /**
   * جلب الإحصائيات الشاملة للوحة التحكم
   */
  async getStats() {
    // تشغيل جميع الاستعلامات بالتوازي (Parallel) لضمان سرعة استجابة هائلة للـ API
    const [
      totalProjects,
      publishedProjects,
      featuredProjects,
      totalLeads,
      newLeadsCount,
      leadsByStatus,
      recentLeads,
      recentProjects,
    ] = await Promise.all([
      this.projectModel.countDocuments(),
      this.projectModel.countDocuments({ isPublished: true }),
      this.projectModel.countDocuments({ isFeatured: true }),
      this.leadModel.countDocuments(),
      this.leadModel.countDocuments({ status: 'جديد' }),

      // تجميع (Aggregation) ذكي لعدّ العملاء في كل حالة تلقائياً
      this.leadModel.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),

      // جلب أحدث 5 عملاء مع بيانات مشاريعهم المهتمين بها
      this.leadModel
        .find()
        .populate('projectId', 'name location')
        .sort({ createdAt: -1 })
        .limit(5),

      // جلب أحدث 5 مشاريع عقارية مضافة
      this.projectModel.find().sort({ createdAt: -1 }).limit(5),
    ]);

    // تنسيق شكل توزيع الحالات لسهولة رسمها في الـ Charts بالفرونت إند
    const formattedStatusDistribution = {
      جديد: 0,
      'قيد التواصل': 0,
      مهتم: 0,
      'غير مهتم': 0,
      'تم التعاقد': 0,
    };

    leadsByStatus.forEach((item) => {
      if (formattedStatusDistribution.hasOwnProperty(item._id)) {
        formattedStatusDistribution[item._id] = item.count;
      }
    });

    return {
      success: true,
      data: {
        counters: {
          totalProjects,
          publishedProjects,
          draftProjects: totalProjects - publishedProjects,
          featuredProjects,
          totalLeads,
          newLeads: newLeadsCount,
          processedLeads: totalLeads - newLeadsCount,
        },
        leadsStatusDistribution: formattedStatusDistribution,
        recentLeads,
        recentProjects,
      },
    };
  }
}
