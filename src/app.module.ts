import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PineconeModule } from './pinecone/pinecone.module';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from './redis/redis.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { History } from './history.entity';
import { File } from './file.entity';

@Module({
  imports: [
    PineconeModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    RedisModule,
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'postgres',
        host: process.env.POSTGRES_HOST,
        port: parseInt(process.env.POSTGRES_PORT),
        username: process.env.POSTGRES_USER,
        password: process.env.POSTGRES_PASSWORD,
        database: process.env.POSTGRES_DB,
        autoLoadEntities: true,
        synchronize: false,
        entities: [__dirname + '/**/*.entity{.ts,.js}']
      }),
    }),
    TypeOrmModule.forFeature([History, File]),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
