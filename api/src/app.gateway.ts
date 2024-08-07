import {
  ConnectedSocket,
  MessageBody,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { v4 as uuid } from 'uuid';
import { JoinRoomSignal, OfferSignal, Room, User } from './app.models';
import { RoomEvent, SocketEvent } from './app.types';
import { filter, map, startWith, Subject } from 'rxjs';
import { toSocketEvent, toSocketSuccessResponse } from './app.utils';
import { toProtectedSerializedRoom } from './app.serializers';

@WebSocketGateway({ cors: true })
export class AppGateway implements OnGatewayDisconnect {
  private rooms: Record<string, Room> = {};
  private connections = new Map<string, { user: User, socket: Socket }>();
  private events$ = new Subject<SocketEvent>();

  constructor() {
  }


  @SubscribeMessage('room')
  async getRoom(@MessageBody() roomKey: string) {
    const room = this.rooms[roomKey]

    return this.events$.pipe(
      filter((event): event is RoomEvent => event.type === 'room' && event.payload.key === roomKey),
      map(event => event.payload),
      startWith(room),
      map(toSocketSuccessResponse),
      map(data => toSocketEvent(`room:${roomKey}`, data)),
    )
  }

  @SubscribeMessage('join')
  async joinRoom(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: JoinRoomSignal,
  ) {
    const username = data.username;
    const roomKey = data.roomKey;
    let room = this.rooms[roomKey];
    const key = uuid();
    const user = {
      id: key,
      key: key,
      username,
    };

    socket.emit('user', user);

    if (!room) {
      room = {
        id: uuid(),
        key: uuid(),
        name: '',
        hostKey: user.key,
        participants: [],
      };
      this.rooms[roomKey] = room;
    }

    console.log(username, 'joining a room', room.id, room.name);

    // const connectionId = `${uuid()}_${Date.now()}_${Math.floor(Math.random() * 1000000000)}`
    this.connections.set(key, {
      user,
      socket,
    });

    room.participants.push({
      user,
      connectionId: key,
    });

    this.events$.next({
      type: 'room',
      payload: room,
    });

    return toSocketSuccessResponse('joined');
  }

  @SubscribeMessage('offer')
  async offer(@MessageBody() data: OfferSignal) {
    console.log('received offer', data);
    return await this.send(data.receiverId, 'offer', data);
  }

  @SubscribeMessage('answer')
  async answer(@MessageBody() data: OfferSignal) {
    console.log('received answer', data);
    return await this.send(data.receiverId, 'answer', data);
  }

  @SubscribeMessage('icecandidate')
  async icecandidate(@MessageBody() data: OfferSignal) {
    console.log('received icecandidate');
    return await this.send(data.receiverId, 'icecandidate', data);
  }

  async send(receiverId: string, event: string, message: unknown) {
    const connection = this.connections.get(receiverId);

    if (!connection) {
      console.log(`failed to send ${event}, no connection found for`, receiverId, Array.from(this.connections.keys()));
      return;
    }

    console.log('emitting', event, 'to', connection.user?.username);

    connection.socket.emit(event, message);
  }

  async handleDisconnect(socket: Socket) {
    for (const [id, connection] of this.connections.entries()) {
      if (socket===connection.socket) {
        const user = await this.userService.findById(connection.user.id);

        if (!user) {
          console.log('unknown client disconnected');
          break;
        }

        for (const roomKey of Object.keys(this.rooms)) {
          const room = this.rooms[roomKey]!;

          if (room.participants.map(participant => participant.user.id).includes(user.id)) {
            room.participants = room.participants.filter(p => p.user.id===user.id);
          }
        }

        this.connections.delete(id);

        console.log('client disconnected', user.username);
      }
    }
  }
}
