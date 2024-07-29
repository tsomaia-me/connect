import { Room, User } from './app.models'

export class RoomBuilder {
  private room: Room

  constructor(room?: Room) {
    this.room = room ?? new Room()
  }

  withName(name: string) {
    const newRoom = this.getClone()
    newRoom.name = name

    return this
  }

  withParticipant(participant: User) {
    const newRoom = this.getClone()
    newRoom.participants.push(participant)

    return this
  }

  withoutParticipant(participant: User) {
    const newRoom = this.getClone()
    newRoom.participants = newRoom.participants.filter(p => p.key !== participant.key)

    return this
  }

  withMaskedKeys() {
    const newRoom = this.getClone()
    newRoom.key = ''
    newRoom.hostKey = ''

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
    const newUser = this.getClone()
    newUser.username = username

    return this
  }

  withMaskedKeys() {
    const newUser = this.getClone()
    newUser.key = ''

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
