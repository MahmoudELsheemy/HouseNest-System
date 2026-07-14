import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OtpVerifiedGuard } from '../../common/guards/otp-verified.guard';

@ApiTags('إدارة المشاريع العقارية (Projects)')  
@Controller()
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  // ─── الـ Endpoints العامة للزوار (Public Website) ───

  @Get('projects')
  @ApiOperation({ summary: 'جلب جميع المشاريع العقارية المنشورا للزوار' })
  @ApiResponse({ status: 200, description: 'قائمة المشاريع المنشورة' })
  async getPublicProjects() {
    return this.projectsService.findAllPublished();
  }

  @Get('projects/featured')
  @ApiOperation({
    summary: 'جلب المشاريع العقارية المميزة فقط للصفحة الرئيسية',
  })
  @ApiResponse({ status: 200, description: 'قائمة المشاريع المميزة' })
  async getFeaturedProjects() {
    return this.projectsService.findFeatured();
  }

  @Get('projects/:slug')
  @ApiOperation({ summary: 'جلب تفاصيل مشروع معين للزائر باستخدام الـ Slug' })
  @ApiResponse({ status: 200, description: 'تفاصيل المشروع المسترجع' })
  async getProjectBySlug(@Param('slug') slug: string) {
    return this.projectsService.findBySlug(slug);
  }

  // ─── الـ Endpoints الخاصة بالأدمن بلوحة التحكم (Dashboard) ───

  @Get('admin/projects')
  @UseGuards(JwtAuthGuard, OtpVerifiedGuard) // حماية المسار بفلتر التوكن + الـ OTP ذو الـ 7 أيام
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'الأدمن: جلب كافة المشاريع (المنشورة والمخفية)' })
  async getAdminProjects() {
    return this.projectsService.findAllForAdmin();
  }

  @Post('admin/projects')
  @UseGuards(JwtAuthGuard, OtpVerifiedGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'الأدمن: إضافة مشروع عقاري جديد' })
  async createProject(@Body() createProjectDto: CreateProjectDto) {
    return this.projectsService.create(createProjectDto);
  }

  @Put('admin/projects/:id')
  @UseGuards(JwtAuthGuard, OtpVerifiedGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'الأدمن: تعديل بيانات مشروع عقاري موجود' })
  async updateProject(
    @Param('id') id: string,
    @Body() updateProjectDto: UpdateProjectDto,
  ) {
    return this.projectsService.update(id, updateProjectDto);
  }

  @Delete('admin/projects/:id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, OtpVerifiedGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'الأدمن: حذف مشروع عقاري نهائياً' })
  async deleteProject(@Param('id') id: string) {
    return this.projectsService.remove(id);
  }
}
