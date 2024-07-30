export class LoginModel {
  username: string
}

export class User {
  id: string
  key: string
  username: string
}

export class CreateRoomModel {
  name: string
  hostKey: string
}

export class JoinRoomModel {
  name: string
  hostKey?: string
}

export class Participant {
  user: User
}

export class Room {
  id: string
  key: string
  name: string
  hostKey: string
  participants: Participant[]
}

export class JoinRoomSignal {
  roomKey: string
  userKey: string
}

export class JoinedRoomSignal {
  user: User
  room: Room
}

export class RoomUpdatedSignal {
  room: Room
}

export class OfferSignal {
  senderId: string
  receiverId: string
  data: RTCSessionDescriptionInit
}

export class AnswerSignal {
  senderId: string
  receiverId: string
  data: RTCSessionDescriptionInit
}

export class IceCandidateSignal {
  senderId: string
  receiverId: string
  data: RTCIceCandidate
}
