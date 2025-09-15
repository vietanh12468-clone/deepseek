import { Module } from '@nestjs/common';
import { SocketGateway } from './socket.gateway';
import { AppService } from 'src/app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { History } from 'src/history.entity';
import { File } from 'src/file.entity';

@Module({
  providers: [SocketGateway, AppService],
  imports: [TypeOrmModule.forFeature([History, File])],
})
export class SocketModule {}
