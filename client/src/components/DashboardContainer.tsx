import { useEffect, useRef } from 'react'
import { Room, User } from '@/app.models'
import { useEmitter, useRealtimeData } from '@/shared/hooks'
import { Dashboard } from '@/components/Dashboard'

export interface DashboardProps {
  userKey: string
  roomKey: string
}

export function DashboardContainer(props: DashboardProps) {
  const { userKey, roomKey } = props
  const emit = useEmitter()
  const [user] = useRealtimeData<User>('user', userKey)
  const [room] = useRealtimeData<Room>('room', roomKey)
  const isJoinRequestSentRef = useRef(false)

  useEffect(() => void (user && console.log('user updated', userKey, user)), [user])
  useEffect(() => void (room && console.log('room updated', roomKey, room)), [room])

  useEffect(() => {
    if (!isJoinRequestSentRef.current) {
      emit('join', { userKey, roomKey })
        .then(() => console.log('joined'))
        .catch(error => console.log('failed to join', error))
    }
  }, [userKey, roomKey, emit])

  return (
    <>
      {user && room && (
        <Dashboard
          user={user}
          room={room}
        />
      )}
    </>
  )
}
