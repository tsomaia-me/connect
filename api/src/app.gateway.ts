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

    if (!room) {
      room = {
        id: uuid(),
        key: uuid(),
        name: '',
        hostKey: user.key,
        participants: [],
        updatedAt: new Date().getTime(),
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
    room.updatedAt = new Date().getTime()

    this.events$.next({
      type: 'room',
      payload: room,
    });

    socket.emit('user', user);

    for (const participant of room.participants) {
      console.log('room.participants', room.participants)
      console.log('rthis.connections', Array.from(this.connections.keys()))
      const connection = this.connections.get(participant.user.key)
      if (connection) {
        console.log('sending roomdata to', participant.user.key)
        connection.socket.emit('roomdata', room)
      }
    }

    console.log(user.key, room.participants.map(p => p.user.key))

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
      if (socket === connection.socket) {
        for (const roomKey of Object.keys(this.rooms)) {
          const room = this.rooms[roomKey]!;

          if (room.participants.map(participant => participant.user.id).includes(id)) {
            room.participants = room.participants.filter(p => p.user.id === id);
          }
        }

        this.connections.delete(id);

        console.log('client disconnected', id);
      }
    }
  }
}
