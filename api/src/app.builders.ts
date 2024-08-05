import { Participant, Room, User } from './app.models'

export class RoomBuilder {
  private room: Room

  constructor(room?: Room) {
    this.room = room ?? new Room()
  }

  withName(name: string) {
    const builder = this.getClone()
    builder.room.name = name

    return builder
  }

  withParticipant(participant: Participant) {
    const builder = this.getClone()

    if (!builder.room.participants.map(p => p.user.id).includes(participant.user.id)) {
      builder.room.participants.push(participant)
    } else {
      builder.room.participants = builder.room.participants
        .map(p => p.user.id === participant.user.id ? participant : p)
    }

    return builder
  }

  withoutParticipant(participant: Participant) {
    const builder = this.getClone()
    builder.room.participants = builder.room.participants
      .filter(p => p.user.id !== participant.user.id)

    return builder
  }

  withMaskedKeys() {
    const builder = this.getClone()
    builder.room.key = ''
    builder.room.hostKey = ''

    return builder
  }

  toModel() {
    return this.getClone().room
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

    return new RoomBuilder(newRoom)
  }
}

export class UserBuilder {
  private user: User

  constructor(user?: User) {
    this.user = user ?? new User()
  }

  withUsername(username: string) {
    const builder = this.getClone()
    builder.user.username = username

    return builder
  }

  withMaskedKeys() {
    const builder = this.getClone()
    builder.user.key = ''

    return builder
  }

  toModel() {
    return this.getClone().user
  }

  toJson() {
    return {
      id: this.user.id,
      key: this.user.key,
      username: this.user.username,
    }
  }

  private getClone() {
    const clonedUser = new User()
    clonedUser.id = this.user.id
    clonedUser.key = this.user.key
    clonedUser.username = this.user.username

    return new UserBuilder(clonedUser)
  }
}
