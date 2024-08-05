import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
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

export interface PeerEventDraft {
  event: string
  payload: Record<string, any>
}

export interface PeerEvent {
  event: string
  peerId: string
  payload: Record<string, any>
}

export type PeerEventListener = (event: PeerEvent) => void

const WebRTCContext = createContext({
  userKey: '',
  roomKey: '',
  self: {
    connectionId: '',
    user: { id: '', key: '', username: '' },
  } as Participant,
  room: { id: '', key: '', name: '', hostKey: '', participants: [] } as Room,
  iceServers: [] as RTCIceServer[],
  peers: [] as Peer[],
  addPeer: (peer: Peer) => void 0,
  removePeer: (id: string) => void 0,
  send: (peerId: string, event: PeerEventDraft) => void 0,
  broadcast: (event: PeerEventDraft) => void 0,
  addPeerEventListener: (eventName: string, listener: PeerEventListener) => void 0,
  removePeerEventListener: (eventName: string, listener: PeerEventListener) => void 0,
})

export function useWebRTCContext() {
  return useContext(WebRTCContext)
}

export function useUserKey() {
  return useWebRTCContext().userKey
}

export function useRoomKey() {
  return useWebRTCContext().roomKey
}

export function useSelf() {
  return useWebRTCContext().self
}

export function useRoom() {
  return useWebRTCContext().room
}

export function usePeers() {
  return useWebRTCContext().peers
}

export function useSender() {
  return useWebRTCContext().send
}

export function useBroadcaster() {
  return useWebRTCContext().broadcast
}

export function useAddPeerEventListener() {
  return useWebRTCContext().addPeerEventListener
}

export function useRemovePeerEventListener() {
  return useWebRTCContext().removePeerEventListener
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

  const participantsWithIndices = useMemo(() => participants.map((p, i) => ({ ...p, i })), [participants])
  const self = useMemo(() => participantsWithIndices.find(p => p.user.id === userId), [participantsWithIndices, userId])
  const others = useMemo(() => participantsWithIndices.filter(p => p.user.id !== userId), [participantsWithIndices, userId])
  const { send, broadcast, addPeerEventListener, removePeerEventListener } = usePeerMessageHandler(
    peers,
    self?.connectionId ?? '',
  )
  const contextValue = useMemo(() => ({
    userKey,
    roomKey,
    self,
    room,
    iceServers,
    peers,
    addPeer,
    removePeer,
    send,
    broadcast,
    addPeerEventListener,
    removePeerEventListener,
  }), [
    userKey,
    roomKey,
    self,
    room,
    iceServers,
    peers,
    addPeer,
    removePeer,
    send,
    broadcast,
    addPeerEventListener,
    removePeerEventListener,
  ])

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

function usePeerMessageHandler(peers: Peer[], selfId: string) {
  const listenersRef = useRef(new Map<string, Set<PeerEventListener>>())
  const existingPeersRef = useRef<Set<string>>(new Set())
  const bufferRef = useRef(new Map<string, PeerEvent[]>())

  const addPeerEventListener = useCallback((eventName: string, listener: PeerEventListener) => {
    if (!listenersRef.current.has(eventName)) {
      listenersRef.current.set(eventName, new Set())
    }

    listenersRef.current.get(eventName)!.add(listener)
  }, [peers])

  const removePeerEventListener = useCallback((eventName: string, listener: PeerEventListener) => {
    listenersRef.current.get(eventName)?.delete(listener)
  }, [peers])

  const addEventToBuffer = useCallback((id: string, event: PeerEvent) => {
    if (!bufferRef.current.has(id)) {
      bufferRef.current.set(id, [])
    }

    bufferRef.current.get(id)?.push({
      ...event,
      peerId: selfId,
    } as PeerEvent)
  }, [selfId])

  const send = useCallback((connectionId: string, eventDraft: PeerEventDraft) => {
    const dataChannel = peers.find(peer => peer.connectionId === connectionId)?.dataChannel
    const peerEvent: PeerEvent = {
      ...eventDraft,
      peerId: selfId,
    }

    if (dataChannel?.readyState === 'open') {
      try {
        dataChannel.send(JSON.stringify({
          ...eventDraft,
          peerId: selfId,
        }))
      } catch (error) {
        console.log(error)
        addEventToBuffer(connectionId, peerEvent)
      }
    } else if (dataChannel) {
      addEventToBuffer(connectionId, peerEvent)
    }
  }, [selfId, peers, addEventToBuffer])

  const broadcast = useCallback((eventDraft: PeerEventDraft) => {
    for (const peer of peers) {
      send(peer.connectionId, eventDraft)
    }
  }, [peers, send])

  useEffect(() => {
    function triggerEvent(peerEvent: PeerEvent) {
      listenersRef.current.get(peerEvent.event)?.forEach(listener => listener(peerEvent))
    }

    const currentConnectionIds = peers.map(p => p.connectionId)
    const disposers: Array<() => void> = []

    for (const existingConnectionId of Array.from(existingPeersRef.current)) {
      if (!currentConnectionIds.includes(existingConnectionId)) {
        triggerEvent({
          event: 'left',
          peerId: existingConnectionId,
          payload: {},
        })
      }
    }

    for (const peer of Array.from(peers.values())) {
      if (!existingPeersRef.current.has(peer.connectionId)) {
        existingPeersRef.current.add(peer.connectionId)
        triggerEvent({
          event: 'joined',
          peerId: peer.connectionId,
          payload: {},
        })

        if (peer.dataChannel.readyState !== 'open') {
          const onPeerDataChannelOpen = () => {
            bufferRef.current.get(peer.connectionId)?.forEach(event => {
              try {
                peer.dataChannel.send(JSON.stringify(event))
              } catch (error) {
                console.log(error)
                addEventToBuffer(peer.connectionId, event)
              }
            })
          }
          peer.dataChannel.addEventListener('open', onPeerDataChannelOpen, { once: true })
          disposers.push(() => {
            peer.dataChannel.removeEventListener('open', onPeerDataChannelOpen)
          })
        }
      }

      if (peer.dataChannel) {
        peer.dataChannel.onmessage = (event) => {
          try {
            const peerEvent = JSON.parse(event.data)
            triggerEvent(peerEvent)
          } catch (error) {
            console.log(`Failed to parse message from peer ${peer.participant.user.username}: `, error)
          }
        }
      }
    }

    return () => {
      for (const peer of Array.from(peers.values())) {
        peer.dataChannel.onmessage = null
      }

      disposers.forEach(disposer => disposer())
    }
  }, [peers])

  return {
    send,
    broadcast,
    addPeerEventListener,
    removePeerEventListener,
  }
}

