import { Room, User } from '@/app.models'
import { Input } from '@/shared/Input'

export interface DashboardProps {
  user: User
  room: Room
}

export function Dashboard(props: DashboardProps) {
  const { user, room } = props

  return (
    <div className="flex flex-row justify-center items-center h-full dark:bg-gray-900">
      <div className="flex flex-col gap-6 text-white">
        <Input value={room.key} readOnly={true}/>
      </div>
    </div>
  )
}
