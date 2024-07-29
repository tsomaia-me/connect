import { Body, Controller, Get, NotFoundException, Param, Post } from '@nestjs/common'
import { UserService } from './user.service'
import { CreateRoomModel, LoginModel, Room, User } from './app.models'
import { RoomService } from './room.service'

@Controller()
export class AppController {
  constructor(
    private readonly userService: UserService,
    private readonly roomService: RoomService,
  ) {
  }

  @Post('/login')
  login(@Body() data: LoginModel): User {
    return this.userService.login(data)
  }

  @Get('/user/:key')
  findUserByKey(@Param('key') key: string): User {
    const user = this.userService.findByKey(key)

    if (!user) {
      throw new NotFoundException(`Unknown key: ${key}`)
    }

    return user
  }

  @Post('/room/create')
  createRoom(@Body() data: CreateRoomModel): Room {
    return this.roomService.createRoom(data)
  }

  @Get('/room/:key')
  findRoomByKey(@Param('key') key: string): Room {
    const room = this.roomService.findByKey(key)

    if (!room) {
      throw new NotFoundException(`Unknown key: ${key}`)
    }

    return room
  }
}
