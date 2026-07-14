import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Project } from './schemas/project.schema';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import slugify from 'slugify';
import { UploadService } from '../upload/upload.service';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectModel(Project.name) private readonly projectModel: Model<Project>,
    private readonly uploadService: UploadService, // حقنه في الـ Constructor لخدمة عمليات الحذف التلقائي للصور
  ) {}

  // ─── طُرق العامة (Public Methods) ───

  /**
   * جلب جميع المشاريع المنشورة فقط للعامة
   */
  async findAllPublished() {
    const projects = await this.projectModel
      .find({ isPublished: true })
      .sort({ createdAt: -1 });
    return { data: projects };
  }

  /**
   * جلب المشاريع المميزة (Featured) فقط للصفحة الرئيسية
   */
  async findFeatured() {
    const projects = await this.projectModel
      .find({ isPublished: true, isFeatured: true })
      .sort({ createdAt: -1 });
    return { data: projects };
  }

  /**
   * جلب تفاصيل مشروع معين عبر الـ Slug
   */
  async findBySlug(slug: string) {
    const project = await this.projectModel.findOne({
      slug,
      isPublished: true,
    });
    if (!project) {
      throw new NotFoundException(
        'المشروع المطلوب غير موجود أو تم إخفاؤه من قبل الإدارة',
      );
    }
    return { data: project };
  }

  // ─── طُرق الإدارة (Admin Methods) ───

  /**
   * جلب جميع المشاريع (المنشورة والمخفية) للأدمن
   */
  async findAllForAdmin() {
    const projects = await this.projectModel.find().sort({ createdAt: -1 });
    return { data: projects };
  }

  /**
   * إنشاء مشروع جديد
   */
  async create(createProjectDto: CreateProjectDto) {
    // استخدام نفس خيارات الـ Schema لضمان عدم حدوث تضارب في الـ Slug
    const slug = slugify(createProjectDto.name, {
      lower: true,
      strict: true,
      trim: true,
    });

    // التأكد من عدم تكرار الـ slug لضمان فرادته
    const existingProject = await this.projectModel.findOne({ slug });
    if (existingProject) {
      throw new ConflictException(
        'يوجد مشروع مسجل بالفعل بهذا الاسم، يرجى اختيار اسم فريد لضمان توليد رابط فريد للـ SEO',
      );
    }

    const newProject = new this.projectModel(createProjectDto);
    await newProject.save();

    return {
      message: 'تم إضافة المشروع العقاري بنجاح',
      data: newProject,
    };
  }

  /**
   * تعديل مشروع موجود
   */
  async update(id: string, updateProjectDto: UpdateProjectDto) {
    const project = await this.projectModel.findById(id);
    if (!project) {
      throw new NotFoundException('المشروع المطلوب غير موجود');
    }

    // إذا تم تعديل الاسم، نقوم بتحديث الـ slug والتحقق من عدم تكراره
    if (updateProjectDto.name && updateProjectDto.name !== project.name) {
      const newSlug = slugify(updateProjectDto.name, {
        lower: true,
        strict: true,
        trim: true,
      });
      const existingProject = await this.projectModel.findOne({
        slug: newSlug,
        _id: { $ne: id },
      });
      if (existingProject) {
        throw new ConflictException(
          'يوجد مشروع آخر مسجل بالفعل بهذا الاسم الجديد، يرجى اختيار اسم آخر',
        );
      }
      project.slug = newSlug;
    }

    // دمج التعديلات وحفظها
    Object.assign(project, updateProjectDto);
    await project.save();

    return {
      message: 'تم تحديث بيانات المشروع بنجاح',
      data: project,
    };
  }

  /**
   * حذف مشروع
   */
  async remove(id: string) {
    const project = await this.projectModel.findById(id);
    if (!project) {
      throw new NotFoundException('المشروع المطلوب غير موجود بالفعل');
    }

    // ─── تنظيف الصور من Cloudinary لمنع تراكم الملفات المهملة وسد الثغرات السحابية ───
    try {
      // 1. حذف الصورة الرئيسية من السحاب
      if (project.coverImage) {
        await this.uploadService.deleteImageByUrl(project.coverImage);
      }

      // 2. حذف صور المعرض (Gallery) بالكامل من السحاب
      if (project.gallery && project.gallery.length > 0) {
        const deletePromises = project.gallery.map((imageUrl) =>
          this.uploadService.deleteImageByUrl(imageUrl),
        );
        await Promise.all(deletePromises);
      }
    } catch (error: any) {
      // نكتفي بتسجيل الخطأ في السيرفر لكي لا نعطل عملية حذف الـ document الأساسية
      const msg = error?.message ?? String(error);
      console.error('⚠️ حدث خطأ أثناء تنظيف صور المشروع من Cloudinary:', msg);
    }

    // حذف المستند الفعلي من قاعدة البيانات
    await project.deleteOne();

    return {
      message: 'تم حذف المشروع العقاري وتنظيف كافة وسائطه السحابية بنجاح',
    };
  }
}
