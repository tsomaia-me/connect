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
import { JoinRoomSignal, OfferSignal } from './app.models'
import { SignalType } from './app.types'
import { toProtectedSerializedRoom, toProtectedSerializedUser } from './app.serializers'

@WebSocketGateway({ cors: true })
export class AppGateway implements OnGatewayDisconnect {
  private connections = new Map<string, Socket>()

  constructor(
    private readonly userService: UserService,
    private readonly roomService: RoomService,
  ) {
  }

  @SubscribeMessage('join_room')
  async joinRoom(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: JoinRoomSignal,
  ) {
    const user = await this.userService.findById(data.userKey)
    const room = await this.roomService.findByKey(data.roomKey)

    if (!user) {
      throw new BadRequestException(`Invalid user key: ${user.key}`)
    }

    if (!room) {
      throw new BadRequestException(`Invalid room key: ${room.key}`)
    }

    this.connections.set(user.id, socket)
    await this.roomService.updateByKey(room.key, builder => builder.withParticipant(user))

    room.participants.forEach(participant => {
      this.send(participant.id, 'joined_room', {
        user: toProtectedSerializedUser(user),
        room: toProtectedSerializedRoom(room),
      })
    })
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
