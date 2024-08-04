export interface User {
  id: string
  key: string
  username: string
}

export interface Participant {
  user: User
  nonce: string
}

export interface Room {
  id: string
  key: string
  name: string
  hostKey: string
  participants: Participant[]
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

export interface OfferSignal {
  senderId: string
  receiverId: string
  data: RTCSessionDescriptionInit
}

export interface AnswerSignal {
  senderId: string
  receiverId: string
  data: RTCSessionDescriptionInit
}

export interface IceCandidateSignal {
  senderId: string
  receiverId: string
  data: RTCIceCandidate
}
