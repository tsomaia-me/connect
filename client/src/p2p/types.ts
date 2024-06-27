import { Peer } from '@/p2p/peer'

export interface KeyPair {
  key: string
  publicKey: string
  address: string
}

export interface SignalMessageParams<T> {
  recipient: string
  data: T
}

export interface SignalMessage<T> {
  sender: string
  recipient: string
  roomAddress: string
  data: T
}

export interface PeerEvent<T> {
  peer: Peer
  address: string
  data: T
}

export type PeerConnectionStateChangedEvent = PeerEvent<{
  connectionState: RTCPeerConnectionState
}>

export type PeerMessageEvent = SignalMessage<string>
