import { SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { promises } from 'dns';
import { AppService } from 'src/app.service';
import { Server, Socket } from 'socket.io';

@WebSocketGateway()
export class SocketGateway {
  constructor(private readonly appService: AppService) { }

  @WebSocketServer()
  server: Server = new Server({
    transports: ['websocket'],
    cors: {
      origin: '*',
    },
    connectTimeout: 45000,
    maxHttpBufferSize: 1e8,
    allowEIO3: true,
    upgradeTimeout: 30000,
    allowUpgrades: true,
    perMessageDeflate: false,
    httpCompression: false,
  });

  @SubscribeMessage('message')
  async handleMessage(client: any, payload: { message: string }) {
    console.log('Received message:', payload);
    let result = await this.appService.askQuestion(payload.message);
    this.server.emit('message', { message: result });
  }
}
