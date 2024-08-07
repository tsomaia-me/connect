export interface User {
  id: string
  key: string
  username: string
}

export interface Participant {
  user: User
  connectionId: string
}

export interface Room {
  id: string
  key: string
  name: string
  hostKey: string
  participants: Participant[]
  updatedAt?: number
}

export interface JoinRoomSignal {
  roomKey: string
  userKey: string
}

export interface JoinedRoomSignal {
  user: User
  room: Room
}

export interface RoomUpdatedSignal {
  room: Room
}

export interface SignalEvent<T> {
  senderId: string
  receiverId: string
  payload: T
}

export interface OfferSignal {
  senderId: string
  receiverId: string
  payload: RTCSessionDescriptionInit
}

export interface AnswerSignal {
  senderId: string
  receiverId: string
  payload: RTCSessionDescriptionInit
}

export interface IceCandidateSignal {
  senderId: string
  receiverId: string
  payload: RTCIceCandidate
}
