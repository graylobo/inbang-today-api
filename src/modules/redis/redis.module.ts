import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { redisStore } from 'cache-manager-redis-store';
import { RedisService } from 'src/modules/redis/redis.service';
console.log('process.env.REDIS_HOST:', process.env.REDIS_HOST);
console.log('process.env.REDIS_PORT:', process.env.REDIS_PORT);
@Module({
  imports: [
    CacheModule.register({
      store: (): any => {
        return redisStore({
          socket: {
            host: process.env.REDIS_HOST,
            port: parseInt(process.env.REDIS_PORT),
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
