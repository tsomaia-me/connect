import {
  ConnectedSocket,
  MessageBody,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway
} from '@nestjs/websockets'
import { BadRequestException } from '@nestjs/common'
import { Socket } from 'socket.io'
import { UserService } from './user.service'
import { RoomService } from './room.service'
import { JoinRoomSignal, OfferSignal, Room, User } from './app.models'
import { RoomEvent, SignalType, SocketEvent, UserEvent } from './app.types'
import { toProtectedSerializedRoom, toProtectedSerializedUser } from './app.serializers'
import { filter, map, startWith, Subject } from 'rxjs'
import { toSocketErrorResponse, toSocketSuccessResponse } from './app.utils'

@WebSocketGateway({ cors: true })
export class AppGateway implements OnGatewayDisconnect {
  private connections = new Map<string, Socket>()
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

    this.connections.set(user.id, socket)
    await this.roomService.updateByKey(room.key, builder => builder.withParticipant(user))

    this.events$.next({
      type: 'room',
      payload: room,
    })

    return toSocketSuccessResponse('joined')
  }

  @SubscribeMessage('offer')
  async offer(@MessageBody() data: OfferSignal) {
    await this.send(data.receiverId, 'offer', data)
  }

  @SubscribeMessage('answer')
  async answer(@MessageBody() data: OfferSignal) {
    await this.send(data.receiverId, 'answer', data)
  }

  @SubscribeMessage('icecandidate')
  async icecandidate(@MessageBody() data: OfferSignal) {
    await this.send(data.receiverId, 'icecandidate', data)
  }

  async send(receiverId: string, event: SignalType, message: unknown) {
    const connection = this.connections.get(receiverId)

    if (connection) {
      const user = await this.userService.findById(receiverId)
      console.log('emitting', event, 'to', user?.username)
      connection.emit(event, message)
    }
  }

  async handleDisconnect(socket: Socket) {
    for (const [id, connection] of this.connections.entries()) {
      if (socket === connection) {
        const user = await this.userService.findById(id)

        if (!user) {
          console.log('unknown client disconnected')
          break
        }

        await this.roomService.updateWhere(
          builder => builder.withoutParticipant(user),
          room => room.participants.map(participant => participant.id).includes(user.id)
        )

        this.connections.delete(id)

        console.log('client disconnected', user.username)
      }
    }
  }
}
