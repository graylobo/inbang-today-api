import { Module } from '@nestjs/common';
import { LiveStreamGateway } from '../../gateway/live-streamer.gateway';
import { CrawlerModule } from '../crawler/crawler.module';

@Module({
  imports: [CrawlerModule],
  providers: [LiveStreamGateway],
  exports: [LiveStreamGateway],
})
export class LiveStreamModule {}
