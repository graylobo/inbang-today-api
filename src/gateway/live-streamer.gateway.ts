import { forwardRef, Inject } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { CrawlerService } from 'src/modules/crawler/crawler.service';

@WebSocketGateway({ cors: true })
export class LiveStreamGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  constructor(
    @Inject(forwardRef(() => CrawlerService))
    private readonly crawlerService: CrawlerService,
  ) {}
  @WebSocketServer() server: Server;

  async handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
    const currentStreamers = await this.crawlerService.getStreamingData();
    this.server.emit('updateLiveStreamers', currentStreamers);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('updateLiveStreamers')
  updateClients(data: any[]): void {
    this.server.emit('updateLiveStreamers', data);
  }
}
