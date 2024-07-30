import { Room, User } from './app.models'

export type SignalType =
  | 'join_room'
  | 'joined_room'
  | 'room_updated'
  | 'offer'
  | 'answer'
  | 'icecandidate'

export interface UserEvent {
  type: 'user'
  payload: User
}

export interface RoomEvent {
  type: 'room'
  payload: Room
}

export type SocketEvent =
  | UserEvent
  | RoomEvent

export interface SocketSuccessResponse<T> {
  ok: true
  payload: T
}

export interface SocketErrorResponse {
  ok: false
  statusCode: number
  message: string
}

export type SocketResponse<T> = SocketSuccessResponse<T> | SocketErrorResponse
