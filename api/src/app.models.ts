import { IsArray, IsNumber, IsString } from 'class-validator'

export class LoginModel {
  @IsString()
  username: string
}

export class User {
  @IsString()
  id: string

  @IsString()
  key: string

  @IsString()
  username: string
}

export class Participant {
  user: User
  connectionId: string
}

export class CreateRoomModel {
  // @IsString()
  // name: string

  @IsString()
  hostKey: string
}

export class JoinRoomModel {
  @IsString()
  name: string

  @IsString()
  hostKey?: string
}

export class Room {
  @IsString()
  id: string

  @IsString()
  key: string

  @IsString()
  name: string

  @IsString()
  hostKey: string

  @IsArray()
  participants: Participant[]
}

export class RealtimeRoomModel {
  @IsString()
  key: string
}

export class JoinRoomSignal {
  @IsString()
  roomKey: string

  @IsString()
  userKey: string

  @IsString()
  username: string
}

export class OfferSignal {
  @IsNumber()
  senderId: string

  @IsNumber()
  receiverId: string

  data: RTCSessionDescriptionInit
}

export class AnswerSignal {
  @IsNumber()
  senderId: string

  @IsNumber()
  receiverId: string

  data: RTCSessionDescriptionInit
}

export class IceCandidateSignal {
  @IsNumber()
  senderId: string

  @IsNumber()
  receiverId: string

  data: RTCIceCandidate
}
