import { IconButton } from '@/components/shared/IconButton'
import { Pen } from '@/components/icons/Pen'
import { FilePen } from '@/components/icons/FilePen'

export interface DashboardControlsProps {
  selectedControl: DashboardControl
  onSelectControl: (control: DashboardControl) => void
}

export type DashboardControl = 'pen' | 'note'

export function DashboardControls(props: DashboardControlsProps) {
  const { selectedControl, onSelectControl } = props

  return (
    <div className="flex flex-col justify-center absolute right-0 h-full px-4">
      <div className="flex flex-col gap-4 justify-center">
        <IconButton isActive={selectedControl === 'pen'} value="pen" onClick={() => onSelectControl('pen')}>
          <Pen/>
        </IconButton>

        <IconButton isActive={selectedControl === 'note'} value="note" onClick={() => onSelectControl('note')}>
          <FilePen/>
        </IconButton>
      </div>
    </div>
  )
}
