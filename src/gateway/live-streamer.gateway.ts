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

  @SubscribeMessage('updateLiveStreamers')
  @OnEvent(STREAM_EVENTS.UPDATE)
  updateClients(data: any[]): void {
    this.server.emit('updateLiveStreamers', data);
  }
}
