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
  connection: RTCPeerConnection | null
  dataChannel: RTCDataChannel | null
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

export interface WebRTCContextValue {
  userKey: string
  roomKey: string
  self: Participant
  room: Room
  iceServers: RTCIceServer[]
  peers: Peer[]
  updatePeer: (connectionId: string, mapPeer: (current: Peer) => Peer) => void
  removePeer: (id: string) => void
  send: (peerId: string, event: PeerEventDraft) => void
  broadcast: (event: PeerEventDraft) => void
  addPeerEventListener: (eventName: string, listener: PeerEventListener) => void
  removePeerEventListener: (eventName: string, listener: PeerEventListener) => void
}

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
  updatePeer: (connectionId: string, mapPeer: (current: Peer) => Peer) => {},
  removePeer: (id: string) => {},
  send: (peerId: string, event: PeerEventDraft) => {},
  broadcast: (event: PeerEventDraft) => {},
  addPeerEventListener: (eventName: string, listener: PeerEventListener) => {},
  removePeerEventListener: (eventName: string, listener: PeerEventListener) => {},
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

  const updatePeer = useCallback((connectionId: string, mapPeer: (current: Peer) => Peer) => {
    setPeers(peers => peers.map(p => p.connectionId === connectionId ? mapPeer(p) : p))
  }, [])

  const removePeer = useCallback((connectionId: string) => {
    setPeers(peers => peers.filter(peer => peer.connectionId !== connectionId))
  }, [])

  const self = useMemo(() => participants.find(p => p.user.id === userId), [participants, userId])
  const selfConnectionId = self?.connectionId
  const participantsWithIndices = useMemo(() => participants.map((p, i) => ({ ...p, i })), [participants])
  const others = useMemo(
    () => participantsWithIndices.filter(p => p.connectionId !== selfConnectionId),
    [participantsWithIndices, selfConnectionId],
  )
  const { send, broadcast, addPeerEventListener, removePeerEventListener } = usePeerMessageHandler(
    peers,
    self?.connectionId ?? '',
  )
  const contextValue = useMemo<WebRTCContextValue | null>(() => !self ? null : ({
    userKey,
    roomKey,
    self,
    room,
    iceServers,
    peers,
    updatePeer,
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
    updatePeer,
    removePeer,
    send,
    broadcast,
    addPeerEventListener,
    removePeerEventListener,
  ])

  useEffect(() => {
    setPeers(peers => others.map(participant => {
      const peer = peers.find(peer => peer.connectionId === participant.connectionId)

      return {
        connectionId: participant.connectionId,
        participant,
        isInitiator: participant.i % 2 === 0,
        connection: peer?.connection ?? null,
        dataChannel: peer?.dataChannel ?? null,
      }
    }))
  }, [others])
  const connectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map())
  const bufferedCandidatesRef = useRef<Map<string, RTCIceCandidate[]>>(new Map())

  if (!contextValue) {
    return
  }

  return (
    <WebRTCContext.Provider value={contextValue}>
      {peers.map(peer => (
        <PeerContainer
          key={peer.connectionId}
          self={contextValue.self}
          peer={peer}
          connectionsRef={connectionsRef}
          bufferedCandidatesRef={bufferedCandidatesRef}
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

  const addEventToBuffer = useCallback((connectionId: string, event: PeerEvent) => {
    if (!bufferRef.current.has(connectionId)) {
      bufferRef.current.set(connectionId, [])
    }

    bufferRef.current.get(connectionId)?.push({
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

    for (const peer of peers) {
      if (!peer.dataChannel) {
        continue
      }

      const peerDataChannel = peer.dataChannel

      if (!existingPeersRef.current.has(peer.connectionId)) {
        existingPeersRef.current.add(peer.connectionId)

        triggerEvent({
          event: 'joined',
          peerId: peer.connectionId,
          payload: {},
        })

        const onPeerDataChannelOpen = () => {
          console.log('Data channel opened, broadcasting')
          broadcast({
            event: 'open',
            payload: {},
          })
        }

        const onPeerReportedOpen = () => {
          console.log('Peer is open, sending buffered messages')

          bufferRef.current.get(peer.connectionId)?.forEach(event => {
            try {
              peerDataChannel.send(JSON.stringify(event))
            } catch (error) {
              console.log(error)
              addEventToBuffer(peer.connectionId, event)
            }
          })
        }

        addPeerEventListener('open', onPeerReportedOpen)
        peerDataChannel.addEventListener('open', onPeerDataChannelOpen, { once: true })

        disposers.push(() => {
          removePeerEventListener('open', onPeerReportedOpen)
          peerDataChannel.removeEventListener('open', onPeerDataChannelOpen)
        })
      }

      peerDataChannel.onmessage = (event) => {
        try {
          console.log('received message from peer', event)
          const peerEvent = JSON.parse(event.data)
          triggerEvent(peerEvent)
        } catch (error) {
          console.log(`Failed to parse message from peer ${peer.participant.user.username}: `, error)
        }
      }
    }

    return () => {
      for (const peer of peers) {
        if (peer.dataChannel) {
          peer.dataChannel.onmessage = null
        }
      }

      disposers.forEach(disposer => disposer())
    }
  }, [peers, broadcast, addPeerEventListener, removePeerEventListener])

  return {
    send,
    broadcast,
    addPeerEventListener,
    removePeerEventListener,
  }
}

