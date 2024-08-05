import { useEffect, useRef, useState } from 'react'
import { Room, User } from '@/app.models'
import { useSignalerSender, useRealtimeData } from '@/components/shared/hooks'
import { PeerConnectionContainer } from '@/components/PeerConnectionContainer'
import { WebRTCProvider } from '@/components/WebRTCProvider'

export interface DataSubscriptionContainerProps {
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
  const { userKey, roomKey } = props
  const emit = useSignalerSender()
  const [user] = useRealtimeData<User>('user', userKey)
  const [room] = useRealtimeData<Room>('room', roomKey)
  const [isJoined, setIsJoined] = useState(false)
  const isJoinRequestSentRef = useRef(false)

  useEffect(() => {
    if (!isJoinRequestSentRef.current) {
      emit('join', { userKey, roomKey })
      setIsJoined(true)
      console.log('[DataSubscriptionContainer] Joined room')
    }
  }, [userKey, roomKey, emit])

  return (
    <>
      {JSON.stringify(user)}
      {user && room && isJoined && (
        <WebRTCProvider
          userKey={userKey}
          roomKey={roomKey}
          user={user}
          room={room}
          iceServers={ICE_SERVERS}
        />
      )}
    </>
  )
}
