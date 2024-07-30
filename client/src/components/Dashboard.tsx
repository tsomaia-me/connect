import { Room, User } from '@/app.models'
import { Input } from '@/shared/Input'
import { PeersMap } from '@/app.types'

export interface DashboardProps {
  userKey: string
  roomKey: string
  user: User
  room: Room
  peers: PeersMap
}

export function Dashboard(props: DashboardProps) {
  const { userKey, roomKey, user, room, peers } = props

  return (
    <div className="flex flex-row justify-center items-center h-full dark:bg-gray-900">
      <div className="flex flex-col gap-6 text-white">
        <Input value={roomKey} readOnly={true}/>
        There {peers.size > 1 ? 'are' : 'is'} {peers.size} other peer{peers.size > 1 ? 's' : ''} in the room
      </div>
    </div>
  )
}
