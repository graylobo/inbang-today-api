import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { redisStore } from 'cache-manager-redis-store';
import { RedisService } from 'src/modules/redis/redis.service';

@Module({
  imports: [
    CacheModule.register({
      store: (): any => {
        return redisStore({
          socket: {
            host: 'localhost',
            port: 6379,
          },
          ttl: 60,
        });
      },
    }),
  ],
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
