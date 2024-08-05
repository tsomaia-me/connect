import { createContext, PropsWithChildren, useCallback, useContext, useMemo, useState } from 'react'
import { Participant, Room, User } from '@/app.models'
import { PeerContainer } from '@/components/PeerContainer'

export interface WebRTCProviderProps extends PropsWithChildren {
  userKey: string
  roomKey: string
  user: User
  room: Room
  iceServers: RTCIceServer[]
}

export interface Peer {
  connectionId: string
  participant: Participant
  isInitiator: boolean
  connection: RTCPeerConnection
  dataChannel: RTCDataChannel
}

const WebRTCContext = createContext({
  userKey: '',
  roomKey: '',
  user: { id: '', key: '', username: '' } as User,
  room: { id: '', key: '', name: '', hostKey: '', participants: [] } as Room,
  iceServers: [] as RTCIceServer[],
  peers: [] as Peer[],
  addPeer: (peer: Peer) => void 0,
  removePeer: (id: string) => void 0,
})

export function useWebRTCContext() {
  return useContext(WebRTCContext)
}

export function WebRTCProvider(props: WebRTCProviderProps) {
  const { userKey, roomKey, user, room, iceServers, children } = props
  const userId = user.id
  const participants = room.participants
  const [peers, setPeers] = useState<Peer[]>([])
  const addPeer = useCallback((peer: Peer) => setPeers(peers => {
    if (peers.map(p => p.connectionId).includes(peer.connectionId)) {
      return peers.map(p => p.connectionId === peer.connectionId ? peer : p)
    }

    return [...peers, peer]
  }), [])
  const removePeer = useCallback((connectionId: string) => {
    setPeers(peers => peers.filter(peer => peer.connectionId !== connectionId))
  }, [])
  const contextValue = useMemo(() => ({
    userKey,
    roomKey,
    user,
    room,
    iceServers,
    peers,
    addPeer,
    removePeer,
  }), [userKey, roomKey, user, room, iceServers, peers, addPeer, removePeer])
  const participantsWithIndices = useMemo(() => participants.map((p, i) => ({ ...p, i })), [participants])
  const self = useMemo(() => participantsWithIndices.find(p => p.user.id === userId), [participantsWithIndices, userId])
  const others = useMemo(() => participantsWithIndices.filter(p => p.user.id !== userId), [participantsWithIndices, userId])

  return (
    <WebRTCContext.Provider value={contextValue}>
      {self && others.map(participant => (
        <PeerContainer
          key={participant.connectionId}
          self={self}
          participant={participant}
          isInitiator={participant.i % 2 === 0}
        />
      ))}
      {children}
    </WebRTCContext.Provider>
  )
}

