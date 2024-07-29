import { Room, User } from './app.models'
import { RoomBuilder, UserBuilder } from './app.builders'

export function toSerializedUser(user: User) {
  return new UserBuilder(user).toJson()
}

export function toProtectedSerializedUser(user: User) {
  return new UserBuilder(user).withMaskedKeys().toJson()
}

export function toSerializedRoom(room: Room) {
  return new RoomBuilder(room).toJson()
}

export function toProtectedSerializedRoom(room: Room) {
  return new RoomBuilder(room).withMaskedKeys().toJson()
}
