import * as io from 'socket.io-client'

export interface PingMessage {
  type: 'ping'
}

export interface PongMessage {
  type: 'pong'
}

export interface TextMessage {
  type: 'text'
  data: string
}

export type PeerMessage = PingMessage | PongMessage | TextMessage

export interface ConnectedSignal {
  type: 'connected'
  clientId: number
}

export interface CreateRoomSignal {
  type: 'create-room'
}

export interface CreateRoomSuccessSignal {
  type: 'create-room-success'
  room: Room
}

export interface CreateRoomFailureSignal {
  type: 'create-room-failure'
  roomId: number
}

export interface JoinRoomSignal {
  type: 'join-room'
  roomId: number
}

export interface JoinRoomSuccessSignal {
  type: 'join-room-success'
  room: Room
}

export interface JoinRoomFailureSignal {
  type: 'join-room-failure'
  roomId: number
  reason: string
}

export interface JoinRequestSignal {
  type: 'join-request'
  peerId: number
}

export interface RoomUpdatedSignal {
  type: 'room-updated'
  room: Room
}

export interface OfferSignal {
  type: 'offer'
  senderId: number
  receiverId: number
  data: RTCSessionDescriptionInit
}

export interface AnswerSignal {
  type: 'answer'
  senderId: number
  receiverId: number
  data: RTCSessionDescriptionInit
}

export interface IceCandidateSignal {
  type: 'icecandidate'
  senderId: number
  receiverId: number
  data: RTCIceCandidate
}

export type ForwardSignal =
  | OfferSignal
  | AnswerSignal
  | IceCandidateSignal

export type Signal =
  | ConnectedSignal
  | CreateRoomSignal
  | CreateRoomSuccessSignal
  | CreateRoomFailureSignal
  | JoinRoomSignal
  | JoinRoomSuccessSignal
  | JoinRoomFailureSignal
  | JoinRequestSignal
  | RoomUpdatedSignal
  | ForwardSignal

export type Callback<T> = (data: T) => void

export interface SignalerEventMap {
  connected: ConnectedSignal
  'create-room': CreateRoomSignal
  'create-room-success': CreateRoomSuccessSignal
  'create-room-failure': CreateRoomFailureSignal
  'join-room': JoinRoomSignal
  'join-room-success': JoinRoomSuccessSignal
  'join-room-failure': JoinRoomFailureSignal
  'room-updated': RoomUpdatedSignal
  'join-request': JoinRequestSignal
  offer: OfferSignal
  answer: AnswerSignal
  icecandidate: IceCandidateSignal
}

export interface Signaler extends EventHandler<SignalerEventMap> {
  send(signal: Signal): void
}

const ICE_SERVERS = [
  {
    urls: 'stun:stun.services.mozilla.com:3478',
  }
]

export class EventHandler<EventMap> {
  private listeners = new Map<any, Array<Callback<any>>>()

  on<Event extends keyof EventMap>(event: Event, callback: Callback<EventMap[Event]>) {
    this.listeners.set(event, [
      ...(this.listeners.get(event) ?? []),
      callback,
    ])
  }

  off<Event extends keyof EventMap>(event: Event, callback: Callback<EventMap[Event]>) {
    if (this.listeners.has(event)) {
      this.listeners.set(
        event,
        this.listeners.get(event)!.filter(listener => listener !== callback),
      )
    }
  }

  trigger<Event extends keyof EventMap>(event: Event, data: EventMap[Event]) {
    this.listeners.get(event)?.forEach(callback => callback(data))
  }
}

export class WebSocketSignaler extends EventHandler<SignalerEventMap> implements Signaler {
  private connection: io.Socket

  constructor(url: string) {
    super()
    this.connection = new io.io(url)
    this.connection.on('signal', signal => {
      this.trigger(signal.type, signal)
    })
  }

  send(signal: Signal) {
    this.connection.emit('signal', signal)
  }
}

export class Room {
  public id: number
  public hostId: number
  public participants: number[]

  constructor() {
  }
}

export class Peer extends EventHandler<{}> {
  public status: 'connecting' | 'connected' | 'closed' = 'connecting'
  public readonly channel = new PeerChannel()

  constructor(
    public readonly id: number,
    public readonly connection: RTCPeerConnection,
  ) {
    super()
  }

  getStatus() {
    return this.status
  }

  close() {
    this.channel.close()
    this.connection.close()
  }
}

export interface PeerChannelEventMap {
  open: void
  closing: void
  close: void
  message: PeerMessage
  ping: PingMessage
  pong: PongMessage
  text: TextMessage
}

export class PeerChannel extends EventHandler<PeerChannelEventMap> {
  private rtcDataChannel: RTCDataChannel | null = null
  private buffer: PeerMessage[] = []

  send(message: PeerMessage) {
    if (this.rtcDataChannel) {
      this.rtcDataChannel.send(JSON.stringify(message))
    } else {
      this.buffer.push(message)
      this.buffer = this.buffer.slice(this.buffer.length - 10)
    }
  }

  close() {
    if (this.rtcDataChannel) {
      this.rtcDataChannel.close()
    }
  }

  attachRtcDataChannel(rtcDataChannel: RTCDataChannel) {
    if (this.rtcDataChannel) {
      this.rtcDataChannel.close()
    }

    this.rtcDataChannel = rtcDataChannel
    this.rtcDataChannel.addEventListener('open', () => this.trigger('open', undefined))
    this.rtcDataChannel.addEventListener('closing', () => this.trigger('closing', undefined))
    this.rtcDataChannel.addEventListener('close', () => this.trigger('close', undefined))
    this.rtcDataChannel.addEventListener('message', event => {
      try {
        const message = JSON.parse(event.data)
        this.trigger(message.type, message)
        this.trigger('message', message)
      } catch (error) {
        console.error(error)
      }
    })

    if (this.buffer.length > 0) {
      this.buffer.forEach(message => {
        this.send(message)
      })
    }
  }
}

export interface PeerNetworkEventMap {
  connected: Peer
  disconnected: Peer
  message: {
    sender: Peer
    message: PeerMessage
  }
}

export class PeerNetwork extends EventHandler<PeerNetworkEventMap> {
  public senderId = -1
  private peers = new Map<number, Peer>()

  constructor(private readonly signaler: Signaler) {
    super()
    this.acceptIncomingConnections()
  }

  getPeers() {
    return Array.from(this.peers.values())
  }

  getConnectedPeers() {
    return this.getPeers().filter(peer => peer.status === 'connected')
  }

  broadcast(message: PeerMessage) {
    this.getConnectedPeers().forEach(peer => {
      console.log('broadcasting to', peer.id)
      peer.channel.send(message)
    })
  }

  connectTo(peerId: number) {
    const peer = this.createPeer(peerId)
    peer.channel.attachRtcDataChannel(peer.connection.createDataChannel('default'))
    peer.channel.on('ping', () => {
      peer.status = 'connected'
      peer.channel.send({ type: 'pong' })
      this.trigger('connected', peer)
    })

    peer.connection.addEventListener('negotiationneeded', async () => {
      console.log('negotiation needed')

      const offer = await peer.connection.createOffer()
      await peer.connection.setLocalDescription(offer)
      this.signaler.send({
        senderId: this.senderId,
        receiverId: peerId,
        type: 'offer',
        data: offer,
      })
    })

    this.signaler.on('answer', async signal => {
      await peer.connection.setRemoteDescription(signal.data)
      peer.status = 'connected'
    })
  }

  private createPeer(peerId: number): Peer {
    if (this.peers.has(peerId)) {
      throw new Error(`Peer with the following ID already exists: ${peerId}`)
    }

    const peerConnection = new RTCPeerConnection({
      iceServers: ICE_SERVERS,
    });
    const peer: Peer = new Peer(peerId, peerConnection)

    peer.connection.addEventListener('icecandidate', event => {
      if (event.candidate) {
        this.signaler.send({
          senderId: this.senderId,
          receiverId: peerId,
          type: 'icecandidate',
          data: event.candidate,
        })
      }
    })

    peer.channel.on('message', message => {
      this.trigger('message', {
        sender: peer,
        message,
      })
    })

    this.peers.set(peerId, peer)

    return peer
  }

  private acceptIncomingConnections() {
    this.signaler.on('offer', async offer => {
      const peer = this.createPeer(offer.senderId)

      peer.connection.addEventListener('datachannel', event => {
        console.log('received data channel')
        peer.channel.attachRtcDataChannel(event.channel)
        peer.channel.send({ type: 'ping' })
        peer.channel.on('pong', () => {
          console.log('received pong')
          peer.status = 'connected'
          this.trigger('connected', peer)
        })
      })

      await peer.connection.setRemoteDescription(offer.data)
      const answer = await peer.connection.createAnswer()
      await peer.connection.setLocalDescription(answer)

      this.signaler.send({
        senderId: this.senderId,
        receiverId: offer.senderId,
        type: 'answer',
        data: answer,
      })
    })

    this.signaler.on('icecandidate', async iceCandidate => {
      const peer = this.peers.get(iceCandidate.senderId)

      if (peer) {
        await peer.connection.addIceCandidate(iceCandidate.data)
      }
    })
  }
}
