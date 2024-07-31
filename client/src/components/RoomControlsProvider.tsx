import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef } from 'react'
import { Peer, PeersMap } from '@/app.types'
import { Participant, Room, User } from '@/app.models'

export interface RoomControlsProviderProps extends PropsWithChildren {
  userKey: string
  roomKey: string
  user: User
  room: Room
  peers: PeersMap
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

const RoomControlsContext = createContext({
  userKey: '',
  roomKey: '',
  user: {} as unknown as User,
  room: {} as unknown as Room,
  peers: new Map<string, Peer>(),
  send: (peerId: string, event: PeerEventDraft) => {
  },
  broadcast: (event: PeerEventDraft) => {
  },
  addPeerEventListener: (eventName: string, listener: PeerEventListener) => {
  },
  removePeerEventListener: (eventName: string, listener: PeerEventListener) => {
  },
})

export function useRoomControls() {
  return useContext(RoomControlsContext)
}

export function useUserKey() {
  return useContext(RoomControlsContext).userKey
}

export function useRoomKey() {
  return useContext(RoomControlsContext).roomKey
}

export function useUser() {
  return useContext(RoomControlsContext).user
}

export function useRoom() {
  return useContext(RoomControlsContext).room
}

export function usePeers() {
  const peers = useContext(RoomControlsContext).peers

  return useMemo(() => {
    return new Map(Array.from(peers.entries()))
  }, [peers])
}

export function useSender() {
  return useContext(RoomControlsContext).send
}

export function useBroadcaster() {
  return useContext(RoomControlsContext).broadcast
}

export function useAddPeerEventListener() {
  return useContext(RoomControlsContext).addPeerEventListener
}

export function useRemovePeerEventListener() {
  return useContext(RoomControlsContext).removePeerEventListener
}

export function RoomControlsProvider(props: RoomControlsProviderProps) {
  const { userKey, roomKey, user, room, peers, children } = props
  const listenersRef = useRef(new Map<string, Set<PeerEventListener>>())
  const userId = user.id
  const send = useCallback((id: string, event: PeerEvent) => {
    const dataChannel = peers.get(id)?.dataChannel

    if (dataChannel?.readyState === 'open') {
      // console.log('send', event)
      dataChannel.send(JSON.stringify({
        ...event,
        senderId: userId,
      }))
    }
  }, [userId, peers])
  const broadcast = useCallback((event: PeerEvent) => {
    for (const peerId of peers.keys()) {
      send(peerId, event)
    }
  }, [peers, send])
  const addPeerEventListener = useCallback((eventName: string, listener: PeerEventListener) => {
    if (!listenersRef.current.has(eventName)) {
      listenersRef.current.set(eventName, new Set())
    }

    listenersRef.current.get(eventName)!.add(listener)
  }, [peers])
  const removePeerEventListener = useCallback((eventName: string, listener: PeerEventListener) => {
    listenersRef.current.get(eventName)?.delete(listener)
  }, [peers])
  const existingPeersRef = useRef<Set<Participant>>(new Set())
  const roomControls = useMemo(() => ({
    userKey,
    roomKey,
    user,
    room,
    peers,
    send,
    broadcast,
    addPeerEventListener,
    removePeerEventListener,
  }), [
    userKey,
    roomKey,
    user,
    room,
    peers,
    send,
    broadcast,
    addPeerEventListener,
    removePeerEventListener,
  ])

  useEffect(() => {
    function triggerEvent(peerEvent: PeerEvent) {
      listenersRef.current.get(peerEvent.event)?.forEach(listener => listener(peerEvent))
    }

    const currentPeerIds = Array.from(peers.keys())

    for (const savedParticipant of existingPeersRef.current) {
      console.log(savedParticipant.user.id, currentPeerIds)
      if (!currentPeerIds.includes(savedParticipant.user.id)) {
        console.log('peer left:', savedParticipant.user.username)
        triggerEvent({
          event: 'left',
          peerId: savedParticipant.user.id,
          payload: {},
        })
      }
    }

    for (const peer of peers.values()) {
      if (!existingPeersRef.current.has(peer.participant)) {
        existingPeersRef.current.add(peer.participant)
        console.log('peer joined:', peer.participant.user.username)
        triggerEvent({
          event: 'joined',
          peerId: peer.participant.user.id,
          payload: {},
        })
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
      for (const peer of peers.values()) {
        peer.dataChannel.onmessage = null
      }
    }
  }, [peers])

  return (
    <RoomControlsContext.Provider value={roomControls}>
      {children}
    </RoomControlsContext.Provider>
  )
}
