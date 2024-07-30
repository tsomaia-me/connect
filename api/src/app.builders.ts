import { Participant, Room, User } from './app.models'

export class RoomBuilder {
  private room: Room

  constructor(room?: Room) {
    this.room = room ?? new Room()
  }

  withName(name: string) {
    this.room = this.getClone()
    this.room.name = name

    return this
  }

  withParticipant(participant: Participant) {
    if (!this.room.participants.map(participant => participant.user.id).includes(participant.user.id)) {
      this.room = this.getClone()
      this.room.participants.push(participant)
    }

    return this
  }

  withoutParticipant(participant: User) {
    this.room = this.getClone()
    this.room.participants = this.room.participants.filter(p => p.user.key !== participant.key)

    return this
  }

  withMaskedKeys() {
    this.room = this.getClone()
    this.room.key = ''
    this.room.hostKey = ''

    return this
  }

  toModel() {
    return this.getClone()
  }

  toJson() {
    return {
      id: this.room.id,
      key: this.room.key,
      name: this.room.name,
      hostKey: this.room.hostKey,
      participants: this.room.participants,
    }
  }

  private getClone() {
    const newRoom = new Room()
    newRoom.id = this.room.id
    newRoom.key = this.room.key
    newRoom.name = this.room.name
    newRoom.hostKey = this.room.hostKey
    newRoom.participants = this.room.participants.slice()

    return newRoom
  }
}

export class UserBuilder {
  private user: User

  constructor(user?: User) {
    this.user = user ?? new User()
  }

  withUsername(username: string) {
    this.user = this.getClone()
    this.user.username = username

    return this
  }

  withMaskedKeys() {
    this.user = this.getClone()
    this.user.key = ''

    return this
  }

  toModel() {
    return this.getClone()
  }

  toJson() {
    return {
      id: this.user.id,
      key: this.user.key,
      username: this.user.username,
    }
  }

  private getClone() {
    const newUser = new User()
    newUser.id = this.user.id
    newUser.key = this.user.key
    newUser.username = this.user.username

    return newUser
  }
}
