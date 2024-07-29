import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AppController } from './app.controller'
import { UserService } from './user.service'
import { RoomService } from './room.service'
import { AppGateway } from './app.gateway'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
  ],
  controllers: [AppController],
  providers: [UserService, RoomService, AppGateway],
})
export class AppModule {
}
