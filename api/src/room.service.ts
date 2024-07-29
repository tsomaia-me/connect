import { Injectable } from '@nestjs/common'
import { CreateRoomModel, Room } from './app.models'
import { RoomBuilder } from './app.builders'
import { EntityService } from './entity.service'

@Injectable()
export class RoomService extends EntityService<Room, RoomBuilder> {
  getBuilder(entity: Room): RoomBuilder {
    return new RoomBuilder(entity)
  }

  createRoom(data: CreateRoomModel) {
    const room: Room = {
      id: this.findUniqueId(),
      key: this.findUniqueKey(),
      name: '',
      hostKey: data.hostKey,
      participants: [],
    }

    this.add(room)

    return room
  }
}
