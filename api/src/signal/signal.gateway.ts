import {
  ConnectedSocket,
  MessageBody, OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway
} from '@nestjs/websockets'
import { Socket } from 'socket.io'

export interface Client {
  id: number
  socket: Socket
  roomId: number | null
}

export interface Room {
  id: number
  hostId: number
  participants: number[]
}

export interface ConnectedSignal {
  type: 'connected'
  clientId: number
}

export interface CreateRoomSignal {
  type: 'create-room'
}

export interface CreateRoomSuccessSignal {
  type: 'create-room-success'
  room: Room
}

export interface CreateRoomFailureSignal {
  type: 'create-room-failure'
  roomId: number
}

export interface JoinRoomSignal {
  type: 'join-room'
  roomId: number
}

export interface JoinRoomSuccessSignal {
  type: 'join-room-success'
  room: Room
}

export interface JoinRoomFailureSignal {
  type: 'join-room-failure'
  roomId: number
  reason: string
}

export interface JoinRequestSignal {
  type: 'join-request'
  peerId: number
}

export interface RoomUpdatedSignal {
  type: 'room-updated'
  room: Room
}

export interface OfferSignal {
  type: 'offer'
  senderId: number
  receiverId: number
  data: RTCSessionDescriptionInit
}

export interface AnswerSignal {
  type: 'answer'
  senderId: number
  receiverId: number
  data: RTCSessionDescriptionInit
}

export interface IceCandidateSignal {
  type: 'icecandidate'
  senderId: number
  receiverId: number
  data: RTCIceCandidate
}

export type ForwardSignal =
  | OfferSignal
  | AnswerSignal
  | IceCandidateSignal

export type Signal =
  | ConnectedSignal
  | CreateRoomSignal
  | CreateRoomSuccessSignal
  | CreateRoomFailureSignal
  | JoinRoomSignal
  | JoinRoomSuccessSignal
  | JoinRoomFailureSignal
  | JoinRequestSignal
  | RoomUpdatedSignal
  | ForwardSignal

@WebSocketGateway({ cors: true })
export class SignalGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private rooms = new Map<number, Room>()
  private clients = new Map<number, Client>()
  private lastRoomId = 0
  private lastUserId = 0

  @SubscribeMessage('signal')
  onSignal(
    @ConnectedSocket() socket: Socket,
    @MessageBody() signal: Signal,
  ) {
    const client = Array.from(this.clients.values()).find(client => client.socket === socket)
    console.log('received signal', signal, 'from', client.id)

    if (!client) {
      return
    }

    const resolvedSignal: Signal = {
      ...signal,
      senderId: client.id,
    } as Signal

    switch (signal.type) {
      case 'create-room':
        this.createRoom(client)
        break

      case 'join-room':
        this.joinRoom(client, resolvedSignal as JoinRoomSignal)
        break

      case 'offer':
      case 'answer':
      case 'icecandidate':
        const forwardSignal = resolvedSignal as ForwardSignal
        const receiver = this.clients.get(forwardSignal.receiverId)

        if (receiver) {
          this.send(receiver, forwardSignal)
        }
        break
    }
  }

  createRoom(client: Client) {
    const roomId = ++this.lastRoomId
    const room = {
      id: roomId,
      hostId: client.id,
      participants: [client.id],
    }
    this.rooms.set(roomId, room)
    this.send(client, {
      type: 'create-room-success',
      room,
    })
  }

  joinRoom(client: Client, signal: JoinRoomSignal) {
    const room = this.rooms.get(signal.roomId)

    if (!room) {
      this.send(client, {
        type: 'join-room-failure',
        roomId: signal.roomId,
        reason: 'ROOM_NOT_FOUND',
      })
    } else if (room.hostId === client.id) {
      this.send(client, {
        type: 'join-room-failure',
        roomId: signal.roomId,
        reason: 'ALREADY_A_HOST',
      })
    } else if (room.participants.includes(client.id)) {
      this.send(client, {
        type: 'join-room-failure',
        roomId: signal.roomId,
        reason: 'ALREADY_A_PARTICIPANT',
      })
    } else {
      room.participants.forEach(id => {
        const participant = this.clients.get(id)

        if (participant) {
          this.send(participant, {
            type: 'join-request',
            peerId: client.id,
          })
        }
      })
      room.participants.push(client.id)
      this.send(client, {
        type: 'join-room-success',
        room,
      })
    }
  }

  send(receiver: Client, signal: Signal) {
    console.log('sending', signal, 'to', receiver.id)
    receiver.socket.emit('signal', signal)
  }

  handleConnection(socket: Socket, ...args): any {
    const id = ++this.lastUserId
    const client = {
      id,
      socket,
      roomId: null,
    }
    this.clients.set(id, client)
    this.send(client, {
      type: 'connected',
      clientId: id,
    })
  }

  handleDisconnect(socket: Socket): any {
    for (const client of this.clients.values()) {
      if (client.socket === socket) {
        console.log('client disconnected', client.id)
        this.clients.delete(client.id)
        if (client.roomId) {
          const clients = this.rooms.get(client.roomId).participants
          this.rooms.get(client.roomId).participants.splice(
            clients.indexOf(client.roomId),
            1,
          )
        }
      }
    }
  }
}
