import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('/')
  root() {
    return {
      success: true,
      message: ' house Management System API is running',
      api: '/api/v1',
    };
  }
}
