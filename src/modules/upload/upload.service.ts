import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor(private configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
      secure: true,
    });
  }

  async uploadImage(
    file: Express.Multer.File,
    folderName = 'house_nest_projects',
  ): Promise<string> {
    if (!file || !file.mimetype.startsWith('image/')) {
      throw new BadRequestException(
        'عذراً، الملف المرفوع يجب أن يكون صورة فقط',
      );
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException(
        'حجم الصورة كبير جداً، الحد الأقصى هو 5 ميجابايت',
      );
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          // ملاحظة: مفيش upload_preset هنا خالص — بنستخدم Signed Upload مباشر
          asset_folder: folderName, // بديل folder في Dynamic Folder Mode
          resource_type: 'image',
          overwrite: true,
          use_filename: false,
          unique_filename: true, // مهم: خليها true عشان تتجنب تعارض أسماء الملفات
          transformation: [{ quality: 'auto', fetch_format: 'auto' }],
        },
        (error, result) => {
          if (error) {
            // اطبع الخطأ كامل عشان تشوف السبب الحقيقي من Cloudinary مش رسالة عامة
            this.logger.error(
              `Cloudinary Upload Error: ${JSON.stringify(error)}`,
            );
            return reject(
              new BadRequestException(`فشل رفع الصورة: ${error.message}`),
            );
          }
          if (!result) {
            return reject(
              new BadRequestException(
                'لم يتم استلام رد مستقر من السيرفر السحابي',
              ),
            );
          }
          resolve(result.secure_url);
        },
      );

      uploadStream.end(file.buffer);
    });
  }

  async uploadMultipleImages(
    files: Express.Multer.File[],
    folderName = 'house_nest_gallery',
  ): Promise<string[]> {
    if (!files || files.length === 0) return [];
    return Promise.all(files.map((file) => this.uploadImage(file, folderName)));
  }

  async deleteImageByUrl(imageUrl: string): Promise<boolean> {
    try {
      if (!imageUrl) return false;
      const urlParts = imageUrl.split('/upload/');
      if (urlParts.length < 2) return false;

      const pathWithFolderAndFile = urlParts[1].replace(/^v\d+\//, '');
      const publicId = pathWithFolderAndFile.substring(
        0,
        pathWithFolderAndFile.lastIndexOf('.'),
      );

      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: 'image',
        invalidate: true,
      });

      this.logger.log(
        `🗑️ Cloudinary delete result for ${publicId}: ${result.result}`,
      );
      return result.result === 'ok';
    } catch (error: any) {
      this.logger.error(
        `❌ Failed to delete image: ${error?.message || error}`,
      );
      return false;
    }
  }
}
