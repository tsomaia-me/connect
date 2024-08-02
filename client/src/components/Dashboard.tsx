import { useEffect, useState } from 'react'
import {
  useAddPeerEventListener,
  useBroadcaster,
  usePeers,
  useRemovePeerEventListener,
  useRoom,
  useRoomKey,
  useSender,
  useUser
} from '@/components/RoomControlsProvider'
import { DrawingCanvas } from '@/components/DrawingCanvas'
import { DashboardFooter } from '@/components/DashboardFooter'
import { DashboardControl, DashboardControls } from '@/components/DashboardControls'

export function Dashboard() {
  const user = useUser()
  const room = useRoom()
  const roomKey = useRoomKey()
  const peers = usePeers()
  const send = useSender()
  const broadcast = useBroadcaster()
  const addPeerEventListener = useAddPeerEventListener()
  const removePeerEventListener = useRemovePeerEventListener()
  const [selectedControl, setSelectedControl] = useState<DashboardControl>('pen')

  useEffect(() => {

  }, [])

  return (
    <div className="flex flex-row justify-center items-center h-full dark:bg-gray-900 relative">
      <DrawingCanvas isActive={selectedControl === 'pen'}/>
      <DashboardControls
        selectedControl={selectedControl}
        onSelectControl={setSelectedControl}
      />
      <DashboardFooter/>
    </div>
  )
}
