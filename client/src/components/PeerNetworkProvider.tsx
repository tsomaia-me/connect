import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { DummySignaler, PeerNetwork, PeerNetworkEventMap, SignalerEventMap, TextMessage } from '@/connection-logic'
import { useSignaler, useSignalerContext } from '@/components/Signaler'
import { Room, User } from '@/app.models'

export interface PeerNetworkProviderProps extends PropsWithChildren {
  user: User
  room: Room
}

export type PeerNetworkStatus = 'connecting' | 'connected' | 'closed';

export interface NetworkMessage {
  senderId: string
  message: unknown
}

const dummyNetwork = new PeerNetwork(new DummySignaler())

const PeerNetworkContext = createContext({
  network: dummyNetwork,
  user: {} as unknown as User,
  status: 'connecting' as PeerNetworkStatus,
  messages: [] as NetworkMessage[],
  addSignalListener: <Event extends keyof PeerNetworkEventMap>(
    event: Event,
    listener: PeerNetworkEventMap[Event]
  ): void => {
  },
  removeSignalListener: <Event extends keyof PeerNetworkEventMap>(
    event: Event,
    listener: PeerNetworkEventMap[Event]
  ): void => {
  },
  broadcast: (message: unknown): void => {
  },
})

export function userPeerNetworkContext() {
  return useContext(PeerNetworkContext)
}

export function useNetwork() {
  return userPeerNetworkContext().network
}

export function useUser() {
  return userPeerNetworkContext().user
}

export function useNetworkStatus() {
  return userPeerNetworkContext().status
}

export function useMessages() {
  return userPeerNetworkContext().messages
}

export function useBroadcaster() {
  return userPeerNetworkContext().broadcast
}

export function useRoom() {
  return useSignalerContext().room
}

export function PeerNetworkProvider(props: PeerNetworkProviderProps) {
  const { user, room, children } = props
  const signaler = useSignaler()
  const [network, setNetwork] = useState<PeerNetwork>(dummyNetwork)
  const [status, setStatus] = useState<PeerNetworkStatus>('connecting')
  const [messages, setMessages] = useState<NetworkMessage[]>([])

  const addMessage = useCallback((senderId: string, message: string) => {
    setMessages(messages => [
      ...messages,
      { senderId, message },
    ])
  }, [])

  const addSignalListener = useCallback(<Event extends keyof SignalerEventMap>(
    event: Event,
    listener: SignalerEventMap[Event],
  ) => {
    signaler.on(event, listener)
  }, [signaler])
  const removeSignalListener = useCallback(<Event extends keyof SignalerEventMap>(
    event: Event,
    listener: SignalerEventMap[Event],
  ) => {
    signaler.off(event, listener)
  }, [])

  const broadcast = useCallback((message: unknown) => {
    if (user.id) {
      const textMessage: TextMessage = {
        type: 'text',
        data: message.value,
      }
      addMessage(user.id, message.value)
      network.broadcast(textMessage)
    }
  }, [user, addMessage])

  const contextValue = useMemo(() => ({
    network,
    user,
    room,
    status,
    messages,
    addSignalListener,
    removeSignalListener,
    broadcast,
  }), [
    network,
    user,
    room,
    status,
    messages,
    addSignalListener,
    removeSignalListener,
    broadcast,
  ])

  useEffect(() => {
    if (!room) {
      return
    }

    const network = new PeerNetwork(signaler)

    network.acceptIncomingConnections()

    setNetwork(network)

    network.on('connected', peer => {
      console.log('Connected to peer', peer.id)
      setStatus('connected')
    })

    network.on('disconnected', peer => {
      console.log('Disconnected from peer', peer.id)
      setStatus('connecting')
    })

    network.on('message', ({ sender, message }) => {
      if (message.type === 'text') {
        addMessage(sender.id, message.data)
      }
    })

    return () => {
      network.close()
    }
  }, [signaler])

  return (
    <PeerNetworkContext.Provider value={contextValue}>
      {network !== dummyNetwork && children}
    </PeerNetworkContext.Provider>
  )
}
