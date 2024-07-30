import { useSignalerStatus } from '@/components/Signaler'
import { useNetworkStatus } from '@/components/PeerNetworkProvider'
import { Room, User } from '@/app.models'
import { Input, useField } from '@/shared/Field'

export interface DashboardProps {
  user: User
  room: Room
}

export function Dashboard(props: DashboardProps) {
  const { user, room } = props
  const signalerStatus = useSignalerStatus()
  const networkStatus = useNetworkStatus()
  const roomKey = useField(room.key)

  return (
    <div className="flex flex-row justify-center items-center h-full dark:bg-gray-900">
      <div className="flex flex-col gap-6 text-white">
        <p>Signaler: {signalerStatus}</p>
        <p>Network: {networkStatus}</p>
        <Input field={roomKey} readOnly={true}/>
      </div>
    </div>
  )
}
