import { MouseEvent, useCallback, useEffect, useState } from 'react'
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
import { DashboardNotes } from '@/components/DashboardNotes'

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
  const [controlPosition, setControlPosition] = useState<[number, number]>([0, 0])
  const handleSelectControl = useCallback((control: DashboardControl, event: MouseEvent<HTMLButtonElement>) => {
    setSelectedControl(control)
    setControlPosition([event.nativeEvent.clientX, event.nativeEvent.clientY])
  }, [])

  useEffect(() => {

  }, [])

  return (
    <div className="flex flex-row justify-center items-center h-full dark:bg-gray-900 relative overflow-hidden">
      <DrawingCanvas isActive={selectedControl === 'pen'}/>
      <DashboardNotes isActive={selectedControl === 'note'} controlPosition={controlPosition}/>
      <DashboardControls
        selectedControl={selectedControl}
        onSelectControl={handleSelectControl}
      />
      <DashboardFooter/>
    </div>
  )
}
