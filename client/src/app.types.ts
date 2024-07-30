export type SignalType =
  | 'join_request'
  | 'offer'
  | 'answer'
  | 'icecandidate'

export interface HttpError {
  message: string
  error: string
  statusCode: number
}

export type PeersRecord = Record<string, Peer>
export type PeersMap = Map<string, Peer>

export interface Peer {
  connection: RTCPeerConnection
  dataChannel: RTCDataChannel | null
}
