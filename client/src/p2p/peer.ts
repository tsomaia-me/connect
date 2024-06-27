import { Signal } from '@/p2p/signal'
import { PeerConnectionStateChangedEvent, PeerEvent, PeerMessageEvent, SignalMessage } from '@/p2p/types'
import { EventHandler } from '@/p2p/event.handler'
import { ec as EC } from 'elliptic'
import * as crypto from 'crypto'

export interface PeerParams {
  address: string
  peerAddress: string
  signal: Signal
  iceServers: RTCIceServer[]
}

export interface PeerEventMap {
  new: PeerConnectionStateChangedEvent
  connecting: PeerConnectionStateChangedEvent
  connected: PeerConnectionStateChangedEvent
  disconnected: PeerConnectionStateChangedEvent
  failed: PeerConnectionStateChangedEvent
  closed: PeerConnectionStateChangedEvent
  'connection-state-changed': PeerConnectionStateChangedEvent
  'channel-opened': Event
  'channel-message': PeerMessageEvent
  'channel-bufferedamountlow': Event
  'channel-error': Event
  'channel-closing': Event
  'channel-closed': Event
  destroy: PeerEvent<void>
}

export class Peer extends EventHandler<PeerEventMap> {
  private address: string
  public peerAddress: string
  public ec: EC
  private signal: Signal
  private connection: RTCPeerConnection
  private dataChannel: RTCDataChannel | null = null

  constructor(private params: PeerParams) {
    super()
    this.signal = params.signal
    this.address = params.address
    this.peerAddress = params.peerAddress
    this.ec = new EC('secp256k1')
    this.onRemoteCandidate = this.onRemoteCandidate.bind(this)
    this.onOffer = this.onOffer.bind(this)
    this.onAnswer = this.onAnswer.bind(this)
    this.onConnectionStateChange = this.onConnectionStateChange.bind(this)
    this.onDataChannel = this.onDataChannel.bind(this)
    this.onLocalCandidate = this.onLocalCandidate.bind(this)
    this.onIceCandidateError = this.onIceCandidateError.bind(this)
    this.onIceGatheringsStateChange = this.onIceGatheringsStateChange.bind(this)
    this.onNegotiationNeeded = this.onNegotiationNeeded.bind(this)
    this.onNegotiationNeeded = this.onNegotiationNeeded.bind(this)
    this.onSignalingStateChange = this.onSignalingStateChange.bind(this)
    this.onTrack = this.onTrack.bind(this)
    this.connection = new RTCPeerConnection({
      iceServers: this.params.iceServers,
    })
    this.signal.on('candidate', this.onRemoteCandidate)
    this.signal.on('offer', this.onOffer)
    this.signal.on('answer', this.onAnswer)
    this.connection.addEventListener('connectionstatechange', this.onConnectionStateChange)
    this.connection.addEventListener('datachannel', this.onDataChannel)
    this.connection.addEventListener('icecandidate', this.onLocalCandidate)
    this.connection.addEventListener('icecandidateerror', this.onIceCandidateError)
    this.connection.addEventListener('icegatheringstatechange', this.onIceGatheringsStateChange)
    this.connection.addEventListener('negotiationneeded', this.onNegotiationNeeded)
    this.connection.addEventListener('signalingstatechange', this.onSignalingStateChange)
    this.connection.addEventListener('track', this.onTrack)
  }

  get connectionState() {
    return this.connection.connectionState
  }

  destroy() {
    this.signal.off('candidate', this.onRemoteCandidate)
    this.signal.off('offer', this.onOffer)
    this.signal.off('answer', this.onAnswer)
    this.connection.removeEventListener('connectionstatechange', this.onConnectionStateChange)
    this.connection.removeEventListener('datachannel', this.onDataChannel)
    this.connection.removeEventListener('icecandidate', this.onLocalCandidate)
    this.connection.removeEventListener('icecandidateerror', this.onIceCandidateError)
    this.connection.removeEventListener('icegatheringstatechange', this.onIceGatheringsStateChange)
    this.connection.removeEventListener('negotiationneeded', this.onNegotiationNeeded)
    this.connection.removeEventListener('signalingstatechange', this.onSignalingStateChange)
    this.connection.removeEventListener('track', this.onTrack)
    this.dataChannel?.close()
    this.connection.close()
    this.trigger('destroy', {
      peer: this,
      address: this.address,
      data: undefined,
    })
  }

  offer() {
    this.dataChannel = this.connection.createDataChannel('default')
    this.setupDatachannel()
  }

  async answer(message: SignalMessage<RTCSessionDescriptionInit>) {
    await this.connection.setRemoteDescription(message.data)
    console.log('remote description set')

    const answer = await this.connection.createAnswer()
    console.log('answer created')

    await this.connection.setLocalDescription(answer)
    console.log('local description set')
    this.signal.answer({
      recipient: this.peerAddress,
      data: answer,
    })
    console.log('answer sent')
  }

  async onOffer(message: SignalMessage<RTCSessionDescriptionInit>) {
    console.log('offer received')
    console.log('data channel created')
  }

  async onAnswer(message: SignalMessage<RTCSessionDescriptionInit>) {
    console.log('answer received')
    await this.connection.setRemoteDescription(message.data)
    console.log('remote description set')
  }

  async onRemoteCandidate(message: SignalMessage<RTCIceCandidateInit>) {
    console.log('candidate received')
    await this.connection.addIceCandidate(message.data)
  }

  onLocalCandidate(event: RTCPeerConnectionIceEvent) {
    if (event.candidate) {
      this.signal.sendCandidate({
        recipient: this.peerAddress,
        data: event.candidate.toJSON(),
      })
      console.log('candidate sent')
    }
  }

  onDataChannel(event: RTCDataChannelEvent) {
    this.dataChannel = event.channel
    this.setupDatachannel()
    console.log('data channel received')
  }

  setupDatachannel() {
    if (!this.dataChannel) {
      return
    }

    this.dataChannel.addEventListener('open', e => this.trigger('channel-opened', e))
    this.dataChannel.addEventListener('message', e => {
      console.log('channel-message', e.data)
      return this.trigger('channel-message', {
        sender: this.peerAddress,
        recipient: this.address,
        data: e.data,
      })
    })
    this.dataChannel.addEventListener('bufferedamountlow', e => this.trigger('channel-bufferedamountlow', e))
    this.dataChannel.addEventListener('error', e => this.trigger('channel-error', e))
    this.dataChannel.addEventListener('closing', e => this.trigger('channel-closing', e))
    this.dataChannel.addEventListener('close', e => this.trigger('channel-closed', e))
  }

  sendMessage(message: string) {
    console.log('send message', this.dataChannel)
    if (this.dataChannel) {
      const publicKey = this.peerAddress
      // const keyPair = this.ec.keyFromPublic(publicKey)
      // const sharedSecret = keyPair.derive(keyPair.getPublic())
      const keyPair = crypto.generateKeyPairSync('ed25519')
      const encryptedMessage = crypto.publicEncrypt(keyPair.publicKey, new TextEncoder().encode(message))
      this.dataChannel.send(new TextDecoder().decode(encryptedMessage))
    }
  }

  onIceCandidateError(event: Event) {
    // console.log('iceConnectionState', this.connection?.iceConnectionState)
  }

  onIceGatheringsStateChange(event: Event) {
    // console.log('iceConnectionState', this.connection?.iceConnectionState)
  }

  async onNegotiationNeeded(event: Event) {
    const offer = await this.connection.createOffer({
      offerToReceiveAudio: true,
    })
    console.log('offer created')
    await this.connection.setLocalDescription(offer)
    console.log('local description set')
    this.signal.offer({
      recipient: this.peerAddress,
      data: offer,
    })
    console.log('offer sent')
  }

  onSignalingStateChange(event: Event) {
    // console.log('signaling state change', this.connection?.signalingState)
  }

  onTrack(event: RTCTrackEvent) {

  }

  onConnectionStateChange(event: Event) {
    switch (this.connection.connectionState) {
      case 'new':
        this.trigger('new', {
          peer: this,
          address: this.peerAddress,
          data: {
            connectionState: this.connection.connectionState,
          },
        })
        break

      case 'connecting':
        this.trigger('connecting', {
          peer: this,
          address: this.peerAddress,
          data: {
            connectionState: this.connection.connectionState,
          },
        })
        break

      case 'connected':
        this.trigger('connected', {
          peer: this,
          address: this.peerAddress,
          data: {
            connectionState: this.connection.connectionState,
          },
        })
        break

      case 'disconnected':
        this.trigger('disconnected', {
          peer: this,
          address: this.peerAddress,
          data: {
            connectionState: this.connection.connectionState,
          },
        })
        break

      case 'failed':
        this.trigger('failed', {
          peer: this,
          address: this.peerAddress,
          data: {
            connectionState: this.connection.connectionState,
          },
        })
        break

      case 'closed':
        this.trigger('closed', {
          peer: this,
          address: this.peerAddress,
          data: {
            connectionState: this.connection.connectionState,
          },
        })
        this.destroy()
        break
    }

    this.trigger('connection-state-changed', {
      peer: this,
      address: this.peerAddress,
      data: {
        connectionState: this.connection.connectionState,
      },
    })
  }
}
