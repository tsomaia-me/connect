import { Signal } from '@/p2p/signal'
import { PeerConnectionStateChangedEvent, PeerEvent, PeerMessageEvent, SignalMessage } from '@/p2p/types'
import { EventHandler } from '@/p2p/event.handler'
import { Peer } from '@/p2p/peer'

export interface PeerConnectorParams {
  address: string
  signal: Signal
  iceServers: RTCIceServer[]
}

export interface PeerEventMap {
  'new-peer': PeerEvent<void>
  connecting: PeerConnectionStateChangedEvent
  connected: PeerConnectionStateChangedEvent
  disconnected: PeerConnectionStateChangedEvent
  failed: PeerConnectionStateChangedEvent
  closed: PeerConnectionStateChangedEvent
  destroy: PeerEvent<void>
  'connection-state-changed': PeerConnectionStateChangedEvent
  'channel-opened': Event
  'channel-message': PeerMessageEvent
  'channel-bufferedamountlow': Event
  'channel-error': Event
  'channel-closing': Event
  'channel-closed': Event
}

export class PeerConnector extends EventHandler<PeerEventMap> {
  private signal: Signal
  private peers: Map<string, Peer> = new Map()

  constructor(private params: PeerConnectorParams) {
    super()
    this.signal = params.signal
  }

  setup() {
    this.onOffer = this.onOffer.bind(this)
    this.signal.on('offer', this.onOffer)
  }

  destroy() {
    Array.from(this.peers.values()).forEach(peer => peer.destroy())
    this.signal.off('offer', this.onOffer)
  }

  async connect(peerAddress: string) {
    const peer = this.createPeer(peerAddress)
    await peer.offer()
  }

  disconnect(peerAddress: string) {
    const peer = this.peers.get(peerAddress)

    if (!peer) {
      throw new Error(`No peer found at address: ${peerAddress}`)
    }

    peer.destroy()
  }

  sendMessage(recipient: string, message: string) {
    const peer = this.peers.get(recipient)

    if (!peer) {
      throw new Error(`No peer found at address: ${recipient}`)
    }

    peer.sendMessage(message)
  }

  async onOffer(message: SignalMessage<RTCSessionDescriptionInit>) {
    const peer = this.createPeer(message.sender)
    await peer.answer(message)
  }

  getConnectedPeers() {
    return Array.from(this.peers.values()).filter(peer => peer.connectionState === 'connected')
  }

  private createPeer(peerAddress: string) {
    const peer = new Peer({
      address: this.params.address,
      peerAddress,
      signal: this.params.signal,
      iceServers: this.params.iceServers,
    })
    peer.on('connecting', message => this.trigger('connecting', message))
    peer.on('connected', message => this.trigger('connected', message))
    peer.on('disconnected', message => this.trigger('disconnected', message))
    peer.on('failed', message => this.trigger('failed', message))
    peer.on('closed', message => this.trigger('closed', message))
    peer.on('connection-state-changed', message => this.trigger('connection-state-changed', message))
    peer.on('channel-opened', message => this.trigger('channel-opened', message))
    peer.on('channel-message', message => this.trigger('channel-message', message))
    peer.on('channel-bufferedamountlow', message => this.trigger('channel-bufferedamountlow', message))
    peer.on('channel-error', message => this.trigger('channel-error', message))
    peer.on('channel-closing', message => this.trigger('channel-closing', message))
    peer.on('channel-closed', message => this.trigger('channel-closed', message))
    peer.on('destroy', message => this.trigger('destroy', message))

    this.peers.set(peerAddress, peer)
    const off = this.trigger('new-peer', {
      peer,
      address: peerAddress,
      data: undefined,
    })
    peer.on('destroy', off)

    return peer
  }
}
