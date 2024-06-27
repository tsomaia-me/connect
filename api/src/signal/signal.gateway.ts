import {
  ConnectedSocket,
  MessageBody,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway
} from '@nestjs/websockets'
import { Socket } from 'socket.io'

export interface Client {
  address: string
  socket: Socket
}

export interface SignalMessage<T> {
  sender: string
  recipient: string
  data: T
}

@WebSocketGateway({ cors: true })
export class SignalGateway implements OnGatewayDisconnect {
  private clients: Map<string, Client> = new Map()

  @SubscribeMessage('online')
  onOnline(
    @MessageBody() message: SignalMessage<void>,
    @ConnectedSocket() client: Socket,
  ) {
   if (message.sender) {
     console.log('client online', message.sender)
     this.clients.set(message.sender, {
       address: message.sender,
       socket: client,
     })
   }
  }

  onOffline(message: SignalMessage<void>) {
    this.clients.delete(message.sender)
  }

  @SubscribeMessage('candidate')
  onCandidate(@MessageBody() message: SignalMessage<RTCIceCandidateInit>) {
    this.send('candidate', message)
  }

  @SubscribeMessage('offer')
  onOffer(
    @MessageBody() message: SignalMessage<RTCSessionDescriptionInit>,
    @ConnectedSocket() client: Socket,
  ) {
    this.send('offer', message)
  }

  @SubscribeMessage('answer')
  onAnswer(@MessageBody() message: SignalMessage<RTCSessionDescriptionInit>) {
    this.send('answer', message)
  }

  send<T>(type: string, message: SignalMessage<T>) {
    const client = this.clients.get(message.recipient)

    if (client) {
      console.log('sending', type, 'to', message.recipient)
      client.socket.emit(type, message)
    }
  }

  handleDisconnect(socket: Socket): any {
    for (const client of this.clients.values()) {
      if (client.socket === socket) {
        this.onOffline({
          sender: client.address,
          recipient: '',
          data: undefined,
        })
      }
    }
  }
}
