import { Module } from '@nestjs/common'
import { SignalGateway } from './signal.gateway'

@Module({
  providers: [
    SignalGateway,
  ]
})
export class SignalModule {
}
