import { OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { MessagesWsService }                                                                             from './messages-ws.service';
import { Server, Socket }                                                                                from 'socket.io';
import { NewMessageDto }                                                                                 from './dtos';
import { JwtService }                                                                                    from '@nestjs/jwt';
import { JwtPayload }                                                                                    from '../auth/interfaces';

@WebSocketGateway({ cors: true, namespace: '/' })
export class MessagesWsGateway implements OnGatewayConnection, OnGatewayDisconnect {

  @WebSocketServer() wss!: Server;

  constructor(
    private readonly messagesWsService: MessagesWsService,
    private readonly jwtService: JwtService
  ) {}
  
  async handleConnection(client: Socket, ...args: any[]) { 
    // console.log(`Cliente conectado: `,client.id)
    // console.log({ conectados: this.messagesWsService.getConnectedClients() });
    const token = client.handshake.headers.token as string;
    let payload: JwtPayload;
    
    try {
      payload = this.jwtService.verify(token);
      await this.messagesWsService.registerClient( client, payload.id! );
    } catch (error) {
      client.disconnect();
      return
    }
    // console.log({
    //   payload
    // })
    this.wss.emit('clients-updated', this.messagesWsService.getConnectedClients())
  }

  handleDisconnect(client: Socket) {
    // console.log(`Cliente desconectado: `,client.id)
    this.messagesWsService.removeClient( client.id );
    // console.log({ conectados: this.messagesWsService.getConnectedClients() });
  }

  // message-from-client
  @SubscribeMessage('message-from-client')
  onMessageFromClient( client: Socket, payload: NewMessageDto ) {

    //! Emite unicamente al cliente
    // client.emit('message-from-server', {
    //   fullName: 'Soy Yo!',
    //   message: payload.message || 'no message'
    // })

    //! Emitir a todos MENOS, al cliente inicial
    // client.broadcast.emit('message-from-server', {
    //   fullName: 'Soy Yo!',
    //   message: payload.message || 'no message'
    // })


    //! Emitir a todos
    this.wss.emit('message-from-server', {
      fullName: this.messagesWsService.getUserFullName(client.id),
      message: payload.message || 'no message'
    })

  }

 
}
