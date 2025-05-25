import { OnEvent } from '@nestjs/event-emitter';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { STREAM_EVENTS } from 'src/events/stream.events';
import { CrawlerService } from 'src/modules/crawler/crawler.service';

@WebSocketGateway({ cors: true })
export class LiveStreamGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  constructor(private readonly crawlerService: CrawlerService) {}
  @WebSocketServer() server: Server;

  async handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
    const currentStreamers = await this.crawlerService.getStreamingData();
    client.emit('updateLiveStreamers', currentStreamers);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  // 전체 스트리머 방출 (데이터가 포함된 경우)
  @SubscribeMessage('updateLiveStreamers')
  updateClients(data: any[]): void {
    this.server.emit('updateLiveStreamers', data);
  }

  // Redis를 통한 업데이트 알림을 처리 (데이터 없이 이벤트만 받는 경우)
  @OnEvent(STREAM_EVENTS.UPDATE)
  async liveStreamersUpdated(): Promise<void> {
    console.log('Received stream update event, notifying clients');
    // Send notification to clients to fetch updated data
    this.server.emit('liveStreamersUpdated');
  }
}
