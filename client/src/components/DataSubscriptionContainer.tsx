import { useEffect, useRef, useState } from 'react'
import { Room, User } from '@/app.models'
import { useEmitter, useRealtimeData } from '@/components/shared/hooks'
import { PeerConnectionContainer } from '@/components/PeerConnectionContainer'

export interface DataSubscriptionContainerProps {
  userKey: string
  roomKey: string
}

export function DataSubscriptionContainer(props: DataSubscriptionContainerProps) {
  const { userKey, roomKey } = props
  const emit = useEmitter()
  const [user] = useRealtimeData<User>('user', userKey)
  const [room] = useRealtimeData<Room>('room', roomKey)
  const [isJoined, setIsJoined] = useState(false)
  const isJoinRequestSentRef = useRef(false)

  useEffect(() => {
    if (!isJoinRequestSentRef.current) {
      emit('join', { userKey, roomKey })
        .then(() => {
          console.log('joined room')
          setIsJoined(true)
        })
        .catch(error => console.log('failed to join', error))
    }
  }, [userKey, roomKey, emit])

  return (
    <>
      {user && room && isJoined && (
        <PeerConnectionContainer
          userKey={userKey}
          roomKey={roomKey}
          user={user}
          room={room}
        />
      )}
    </>
  )
}
