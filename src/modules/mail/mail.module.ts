import { Module, Global } from '@nestjs/common';
import { MailService } from './mail.service';

@Global() // جعل الموديول متاحاً على مستوى النظام بالكامل دون الحاجة لإعادة استيراده في كل مكان
@Module({
  providers: [MailService],
  exports: [MailService], // تصدير الخدمة لاستخدامها في الموديولات الأخرى
})
export class MailModule {}
