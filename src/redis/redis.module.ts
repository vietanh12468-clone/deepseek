import { Module } from '@nestjs/common';
import { RedisService } from './redis.service';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { RedisAdapter } from './redis.adapter';
import { RedisController } from './redis.controller';
// import { RedisIoAdapter } from './redis-io.adapter';
import { Redis } from 'ioredis';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'REDIS_VECTOR_SERVICE',
        transport: Transport.REDIS,
        options: {
          host: process.env.REDIS_HOST ?? 'localhost',
          port: isNaN(parseInt(process.env.REDIS_PORT, 10))
            ? 6379
            : parseInt(process.env.REDIS_PORT, 10),
        },
      },
    ]),
  ],
  controllers: [RedisController],
  providers: [
    RedisService,
    RedisAdapter,
    {
      provide: 'REDIS',
      useFactory: () => {
        return new Redis({
          host: process.env.REDIS_HOST ?? 'localhost',
          port: isNaN(parseInt(process.env.REDIS_PORT, 10))
            ? 6379
            : parseInt(process.env.REDIS_PORT, 10),
        });
      },
    },
  ],
  exports: [RedisService, RedisAdapter],
})
export class RedisModule {}
