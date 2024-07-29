import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { DummySignaler, Signaler, SignalerEventMap, WebSocketSignaler } from '@/connection-logic'
import { Room, User } from '@/app.models'

export interface SignalerProps extends PropsWithChildren {
  signalingServerUrl: string;
}

export type SignalerStatus = 'connecting' | 'connected' | 'closed';

const dummySignaler = new DummySignaler()

const SignalerContext = createContext({
  signaler: dummySignaler as Signaler,
  status: 'connecting' as SignalerStatus,
  room: null as Room | null,
  addSignalListener: <Event extends keyof SignalerEventMap>(
    event: Event,
    listener: SignalerEventMap[Event]
  ): void => {
  },
  removeSignalListener: <Event extends keyof SignalerEventMap>(
    event: Event,
    listener: SignalerEventMap[Event]
  ): void => {
  },
  joinRequests: [] as User[],
  sendSignal: <E extends keyof SignalerEventMap>(event: E, signal: SignalerEventMap[E]): void => {
  },
  clearJoinRequests: (): void => {
  },
  createRoom: (): void => {
  },
  joinRoom: (roomId: number): void => {
  },
})

export function useSignalerContext() {
  return useContext(SignalerContext)
}

export function useSignaler() {
  return useSignalerContext().signaler
}

export function useSignalerStatus() {
  return useSignalerContext().status
}

export function useJoinRequests() {
  return useSignalerContext().joinRequests
}

export function useSendSignal() {
  return useSignalerContext().sendSignal
}

export function useClearJoinRequests() {
  return useSignalerContext().clearJoinRequests
}

export function Signaler(props: SignalerProps) {
  const { signalingServerUrl, children } = props
  const [signaler, setSignaler] = useState<Signaler>(dummySignaler)
  const [status, setStatus] = useState<SignalerStatus>('connected')
  const [room, setRoom] = useState<Room | null>(null)
  const [joinRequests, setJoinRequests] = useState<User[]>([])

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

  const sendSignal = useCallback(<E extends keyof SignalerEventMap>(event: E, signal: SignalerEventMap[E]) => {
    signaler.send(event, signal)
  }, [])
  const clearJoinRequests = useCallback(() => setJoinRequests([]), [])
  const createRoom = useCallback(() => {
    sendSignal({
      type: 'create-room'
    })
  }, [sendSignal])
  const joinRoom = useCallback((roomId: number) => {
    sendSignal({
      type: 'join_room',
      roomId,
    })
  }, [sendSignal])

  const contextValue = useMemo(() => ({
    signaler,
    status,
    room,
    joinRequests,
    addSignalListener,
    removeSignalListener,
    sendSignal,
    clearJoinRequests,
    createRoom,
    joinRoom,
  }), [
    signaler,
    status,
    room,
    clearJoinRequests,
    removeSignalListener,
    joinRequests,
    sendSignal,
    createRoom,
    joinRoom,
  ])

  useEffect(() => {
    const signaler = new WebSocketSignaler(signalingServerUrl)

    setSignaler(signaler)

    signaler.on('joined_room', signal => {
      setRoom(signal.room)
    })

    signaler.on('joined_room', signal => {
      console.log('New user joined', signal.room)
      setJoinRequests(joinRequests => [...joinRequests, signal.user])
    })

    return () => {
      signaler.close()
      setStatus('closed')
    }
  }, [signalingServerUrl])

  return (
    <SignalerContext.Provider value={contextValue}>
      {signaler !== dummySignaler && children}
    </SignalerContext.Provider>
  )
}
