import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { EventEmitter2 } from '@nestjs/event-emitter';
import Redis from 'ioredis';
import { STREAM_EVENTS } from 'src/events/stream.events';

@Injectable()
export class RedisService implements OnModuleInit {
  private subscriberClient: Redis;

  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async onModuleInit() {
    // Create a separate Redis connection for subscriptions
    this.subscriberClient = new Redis({
      host: process.env.REDIS_HOST || 'redis',
      port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    });

    // Subscribe to streaming data updates from the cron service
    this.subscriberClient.subscribe('streaming_data_updated');

    this.subscriberClient.on('message', (channel, message) => {
      if (channel === 'streaming_data_updated') {
        console.log('Received streaming data update notification');
        // Emit the event to notify the WebSocket gateway
        this.eventEmitter.emit(STREAM_EVENTS.UPDATE);
      }
    });

    this.subscriberClient.on('error', (err) => {
      console.error('Redis Subscriber Error:', err);
    });
  }

  async set(key: string, value: any, ttl: number) {
    await this.cacheManager.set(key, value, { ttl } as any);
  }

  async get(key: string) {
    return await this.cacheManager.get(key);
  }

  async del(key: string) {
    await this.cacheManager.del(key);
  }
}
