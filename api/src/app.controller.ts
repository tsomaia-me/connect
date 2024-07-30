import { Body, Controller, NotFoundException, Param, Post } from '@nestjs/common'
import { UserService } from './user.service'
import { CreateRoomModel, LoginModel, Room, User } from './app.models'
import { RoomService } from './room.service'

@Controller('/api')
export class AppController {
  constructor(
    private readonly userService: UserService,
    private readonly roomService: RoomService,
  ) {
  }

  @Post('/login')
  async login(@Body() data: LoginModel): Promise<User> {
    return await this.userService.login(data)
  }

  @Post('/user/:key')
  async findUserByKey(@Param('key') key: string): Promise<User> {
    const user = await this.userService.findByKey(key)

    if (!user) {
      throw new NotFoundException(`Unknown key: ${key}`)
    }

    return user
  }

  @Post('/room/create')
  async createRoom(@Body() data: CreateRoomModel): Promise<Room> {
    return await this.roomService.createRoom(data)
  }

  @Post('/room/:key')
  async findRoomByKey(@Param('key') key: string): Promise<Room> {
    const room = await this.roomService.findByKey(key)

    if (!room) {
      throw new NotFoundException(`Unknown key: ${key}`)
    }

    return room
  }
}
