import { IconButton } from '@/components/shared/IconButton'
import { Pen } from '@/components/icons/Pen'
import { FilePen } from '@/components/icons/FilePen'
import { MouseEvent } from 'react'

export interface DashboardControlsProps {
  selectedControl: DashboardControl | null
  onSelectControl: (control: DashboardControl | null, event: MouseEvent<HTMLButtonElement>) => void
}

export type DashboardControl = 'pen' | 'note'

export function DashboardControls(props: DashboardControlsProps) {
  const { selectedControl, onSelectControl } = props

  return (
    <div className="flex flex-col justify-center absolute right-0 h-full px-4">
      <div className="flex flex-col gap-4 justify-center">
        <IconButton isActive={selectedControl === 'pen'} value="pen" onClick={e => onSelectControl('pen', e)}>
          <Pen/>
        </IconButton>

        <IconButton isActive={selectedControl === 'note'} value="note" onClick={e => onSelectControl('note', e)}>
          <FilePen/>
        </IconButton>
      </div>
    </div>
  )
}
