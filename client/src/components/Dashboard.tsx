import { MouseEvent, useCallback, useState } from 'react'
import { DrawingCanvas } from '@/components/DrawingCanvas'
import { DashboardFooter } from '@/components/DashboardFooter'
import { DashboardControl, DashboardControls } from '@/components/DashboardControls'
import { DashboardNotes } from '@/components/DashboardNotes'
import { DashboardHeader } from '@/components/DashboardHeader'

export function Dashboard() {
  const [selectedControl, setSelectedControl] = useState<DashboardControl | null>('pen')
  const [selectedSize, setSelectedSize] = useState(2)
  const [selectedColor, setSelectedColor] = useState('#FFFFFF')
  const [controlPosition, setControlPosition] = useState<[number, number]>([0, 0])
  const handleSelectControl = useCallback((control: DashboardControl | null, event: MouseEvent<HTMLButtonElement>) => {
    setSelectedControl(control)
    setControlPosition([event.nativeEvent.clientX, event.nativeEvent.clientY])
  }, [])

  return (
    <div
      className="flex flex-row justify-center items-center h-full dark:bg-gray-900 relative overflow-hidden pr-24 pl-12 py-20">
      <div
        className="flex flex-row justify-center items-center flex-1 h-full dark:bg-gray-800 overflow-hidden rounded-lg border-gray-300 shadow-lg">
        <DashboardHeader/>
        <DrawingCanvas
          isActive={selectedControl === 'pen'}
          selectedSize={selectedSize}
          selectedColor={selectedColor}
        />
        <DashboardNotes
          isActive={selectedControl === 'note'}
          controlPosition={controlPosition}
        />
        <DashboardControls
          selectedControl={selectedControl}
          selectedColor={selectedColor}
          selectedSize={selectedSize}
          onSelectControl={handleSelectControl}
          onSelectSize={setSelectedSize}
          onSelectColor={setSelectedColor}
        />
        <DashboardFooter/>
      </div>
    </div>
  )
}
