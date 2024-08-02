import { Input } from '@/components/shared/Input'
import { usePeers, useRoomKey } from '@/components/RoomControlsProvider'

export function DashboardFooter() {
  const roomKey = useRoomKey()
  const peers = usePeers()

  return (
    <div className="flex flex-col gap-4 text-white absolute bottom-0 p-4">
      <div className="flex items-center">
        <Input className="w-72" value={roomKey} readOnly={true} onClick={async e => {
          (e.target as HTMLInputElement).select()
          await navigator.clipboard.writeText((e.target as HTMLInputElement).value)
        }}/>
      </div>
      <p className="text-center">
        {peers.size === 0 ? 'You are the only one in the room' : `There are ${peers.size + 1} people in the room`}
      </p>
    </div>
  )
}
