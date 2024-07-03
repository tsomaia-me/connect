import * as io from 'socket.io-client'
import { SignalMessage, SignalMessageParams } from 'p2p/types'
import { EventHandler } from 'p2p/event.handler'

export interface SignalParams {
  url: string
  address: string
  roomAddress: string
}

export interface SignalEventMap {
  connect: void
  'connection-error': Error
  disconnect: io.Socket.DisconnectReason
  candidate: SignalMessage<RTCIceCandidateInit>
  offer: SignalMessage<RTCSessionDescriptionInit>
  answer: SignalMessage<RTCSessionDescriptionInit>
}

export class Signal extends EventHandler<SignalEventMap> {
  private address: string
  private roomAddress: string
  private url: string
  private connection: io.Socket | null = null
  private listeners: Map<string, Function[]> = new Map()

  constructor(params: SignalParams) {
    super()
    this.address = params.address
    this.roomAddress = params.roomAddress
    this.url = params.url
    this.onConnect = this.onConnect.bind(this)
    this.onDisconnect = this.onDisconnect.bind(this)
    this.onConnectError = this.onConnectError.bind(this)
    this.onMessage = this.onMessage.bind(this)
  }

  setup() {
    this.connection = io.io(this.url)
    this.connection.on('connect', this.onConnect)
    this.connection.on('disconnect', this.onDisconnect)
    this.connection.on('connect_error', this.onConnectError)
    this.connection.onAny(this.onMessage)
  }

  destroy() {
    if (!this.connection) {
      return
    }

    this.connection.off('connect', this.onConnect)
    this.connection.off('disconnect', this.onDisconnect)
    this.connection.off('connect_error', this.onConnectError)
    this.connection.offAny(this.onMessage)
    this.connection.close()
    this.connection = null
    this.listeners = new Map()
  }

  online() {
    if (this.connection) {
      this.connection.emit('online', {
        sender: this.address,
        roomAddress: this.roomAddress,
      })
    }
  }

  sendCandidate(message: SignalMessageParams<RTCIceCandidateInit>) {
    if (this.connection) {
      this.connection.emit('candidate', {
        ...message,
        sender: this.address,
        roomAddress: this.roomAddress,
      })
    }
  }

  offer(message: SignalMessageParams<RTCSessionDescriptionInit>) {
    if (this.connection) {
      this.connection.emit('offer', {
        ...message,
        sender: this.address,
        roomAddress: this.roomAddress,
      })
    }
  }

  answer(message: SignalMessageParams<RTCSessionDescriptionInit>) {
    if (this.connection) {
      this.connection.emit('answer', {
        ...message,
        sender: this.address,
        roomAddress: this.roomAddress,
      })
    }
  }

  onConnect() {
    if (this.connection) {
      this.online()
      this.trigger('connect', undefined)
    }
  }

  onDisconnect(reason: io.Socket.DisconnectReason) {
    if (this.connection) {
      this.trigger('disconnect', reason)
    }
  }

  onConnectError(event: Error) {
    if (this.connection) {
      this.trigger('connection-error', event)
    }
  }

  onMessage(type: string, message: SignalMessage<unknown>) {
    console.log(type, message)
    this.trigger(
      type as unknown as keyof SignalEventMap,
      message as unknown as SignalEventMap[keyof SignalEventMap],
    )
  }
}
