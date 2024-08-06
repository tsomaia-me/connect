import { MouseEvent, useCallback, useState } from 'react'
import { DrawingCanvas } from '@/components/DrawingCanvas'
import { DashboardFooter } from '@/components/DashboardFooter'
import { DashboardControl, DashboardControls } from '@/components/DashboardControls'
import { DashboardNotes } from '@/components/DashboardNotes'

export function Dashboard() {
  const [selectedControl, setSelectedControl] = useState<DashboardControl | null>('pen')
  const [controlPosition, setControlPosition] = useState<[number, number]>([0, 0])
  const handleSelectControl = useCallback((control: DashboardControl | null, event: MouseEvent<HTMLButtonElement>) => {
    setSelectedControl(control)
    setControlPosition([event.nativeEvent.clientX, event.nativeEvent.clientY])
  }, [])

  // useEffect(() => {
  //   navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  //     .then(() => {
  //
  //     })
  // }, [])

  return (
    <div className="flex flex-row justify-center items-center h-full dark:bg-gray-900 relative overflow-hidden">
      <DrawingCanvas isActive={selectedControl === 'pen'}/>
      <DashboardNotes
        isActive={selectedControl === 'note'}
        controlPosition={controlPosition}
      />
      <DashboardControls
        selectedControl={selectedControl}
        onSelectControl={handleSelectControl}
      />
      <DashboardFooter/>
    </div>
  )
}
