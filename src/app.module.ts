import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PineconeModule } from './pinecone/pinecone.module';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [
    PineconeModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    RedisModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
