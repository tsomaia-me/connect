import { useEffect, useMemo, useRef, useState } from 'react';
import { Room, User } from '@/app.models'
import { useRealtimeData, useSignalSender } from '@/components/shared/hooks'
import { WebRTCProvider } from '@/components/WebRTCProvider'
import { Dashboard } from '@/components/Dashboard'
import { DashboardNotesProvider } from '@/components/DashboardNotesProvider'
import { useSignaler } from '@/components/SocketProvider';

export interface DataSubscriptionContainerProps {
  username: string
  userKey: string
  roomKey: string
}

const ICE_SERVERS = [
  {
    urls: 'stun:stun.services.mozilla.com:3478',
  },
  // {
  //   urls: 'stun:165.232.76.90:3478',
  // },
  {
    urls: 'turn:165.232.76.90:3478',
    username: 'tsomaiame',
    credential: 'dsdgm31990',
  },
]

export function DataSubscriptionContainer(props: DataSubscriptionContainerProps) {
  const { username, roomKey } = props
  const signaler = useSignaler()
  const emit = useSignalSender()
  const [room$] = useRealtimeData<Room>('room', roomKey)
  const [isJoined, setIsJoined] = useState(false)
  const isJoinRequestSentRef = useRef(false)
  const [user, setUser] = useState<User | null>(null)
  const [room, setRoom] = useState<Room | null>(null)

  useEffect(() => {
    if (!isJoinRequestSentRef.current) {
      signaler.on('joined', ({ user, room }) => {
        console.log('user', user)
        setUser(user)
        setRoom(room)
        setIsJoined(true)
      })
      emit('join', { username, roomKey })
      console.log('[DataSubscriptionContainer] Joined room')
    }
  }, [username, roomKey, signaler, emit])

  useEffect(() => {
    if (room?.key === room$?.key) {
      setRoom(room$)
    }
  }, [room, room$]);

  return (
    <>
      <p>{JSON.stringify(user)}</p>
      <p>{JSON.stringify(room)}</p>
      <p>{JSON.stringify(isJoined)}</p>
      <p>{JSON.stringify(user && room && isJoined)}</p>
      {user && room && isJoined && (
        <WebRTCProvider
          user={user}
          userKey={user.key}
          roomKey={roomKey}
          room={room}
          iceServers={ICE_SERVERS}
        >
          <DashboardNotesProvider>
            <Dashboard/>
          </DashboardNotesProvider>
        </WebRTCProvider>
      )}
    </>
  )
}
