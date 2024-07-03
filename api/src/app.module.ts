import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
// import { PrismaModule } from './prisma'
import { SignalModule } from './signal'
import { AppController } from './app.controller'
import { AppService } from './app.service'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // PrismaModule,
    SignalModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
}
