import {
  ConnectedSocket,
  MessageBody,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway
} from '@nestjs/websockets'
import { Socket } from 'socket.io'
import { v4 as uuid } from 'uuid'
import { UserService } from './user.service'
import { RoomService } from './room.service'
import { JoinRoomSignal, OfferSignal, User } from './app.models'
import { RoomEvent, SocketEvent, UserEvent } from './app.types'
import { toProtectedSerializedRoom, toProtectedSerializedUser } from './app.serializers'
import { filter, map, startWith, Subject } from 'rxjs'
import { toSocketErrorResponse, toSocketEvent, toSocketSuccessResponse } from './app.utils'

@WebSocketGateway({ cors: true })
export class AppGateway implements OnGatewayDisconnect {
  private connections = new Map<string, { user: User, socket: Socket }>()
  private events$ = new Subject<SocketEvent>()

  constructor(
    private readonly userService: UserService,
    private readonly roomService: RoomService,
  ) {
  }

  @SubscribeMessage('user')
  async getUser(@MessageBody() userKey: string) {
    const user = await this.userService.findByKey(userKey)

    return this.events$.pipe(
      filter((event): event is UserEvent => event.type === 'user' && event.payload.key === userKey),
      map(event => event.payload),
      startWith(user),
      map(user => toProtectedSerializedUser(user)),
      map(toSocketSuccessResponse),
      map(data => toSocketEvent(`user:${userKey}`, data)),
    )
  }

  @SubscribeMessage('room')
  async getRoom(@MessageBody() roomKey: string) {
    const room = await this.roomService.findByKey(roomKey)

    return this.events$.pipe(
      filter((event): event is RoomEvent => event.type === 'room' && event.payload.key === roomKey),
      map(event => event.payload),
      startWith(room),
      map(room => toProtectedSerializedRoom(room)),
      map(toSocketSuccessResponse),
      map(data => toSocketEvent(`room:${roomKey}`, data)),
    )
  }

  @SubscribeMessage('join')
  async joinRoom(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: JoinRoomSignal,
  ) {
    const user = await this.userService.findByKey(data.userKey)
    const room = await this.roomService.findByKey(data.roomKey)

    if (!user) {
      return toSocketErrorResponse(404, `Invalid user key: ${data.userKey}`)
    }

    if (!room) {
      return toSocketErrorResponse(404, `Invalid room key: ${data.roomKey}`)
    }

    console.log(user.username, 'joining a room', room.id, room.name)

    const connectionId = `${uuid()}_${Date.now()}_${Math.floor(Math.random() * 1000000000)}`
    this.connections.set(connectionId, {
      user,
      socket,
    })

    const updatedRoom = await this.roomService.updateByKey(room.key, builder => builder.withParticipant({
      user,
      connectionId,
    }))

    this.events$.next({
      type: 'room',
      payload: updatedRoom,
    })

    return toSocketSuccessResponse('joined')
  }

  @SubscribeMessage('offer')
  async offer(@MessageBody() data: OfferSignal) {
    console.log('received offer', data)
    return await this.send(data.receiverId, 'offer', data)
  }

  @SubscribeMessage('answer')
  async answer(@MessageBody() data: OfferSignal) {
    console.log('received answer', data)
    return await this.send(data.receiverId, 'answer', data)
  }

  @SubscribeMessage('icecandidate')
  async icecandidate(@MessageBody() data: OfferSignal) {
    return await this.send(data.receiverId, 'icecandidate', data)
  }

  async send(receiverId: string, event: string, message: unknown) {
    const connection = this.connections.get(receiverId)

    if (!connection) {
      return
    }

    console.log('emitting', event, 'to', connection.user?.username)

    connection.socket.emit(event, message)
  }

  async handleDisconnect(socket: Socket) {
    for (const [id, connection] of this.connections.entries()) {
      if (socket === connection.socket) {
        const user = await this.userService.findById(id)

        if (!user) {
          console.log('unknown client disconnected')
          break
        }

        await this.roomService.updateWhere(
          builder => builder.withoutParticipant(user),
          room => room.participants.map(participant => participant.user.id).includes(user.id)
        )

        this.connections.delete(id)

        console.log('client disconnected', user.username)
      }
    }
  }
}
