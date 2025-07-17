import { Injectable, OnModuleInit } from '@nestjs/common';
import { PlatformService } from './modules/platform/platform.service';

@Injectable()
export class AppService implements OnModuleInit {
  constructor(private readonly platformService: PlatformService) {}

  async onModuleInit() {
    // 앱 시작 시 기본 플랫폼 초기화
    await this.platformService.initializeDefaultPlatforms();
  }

  getHello(): string {
    return 'Hello World!!!';
  }
}
