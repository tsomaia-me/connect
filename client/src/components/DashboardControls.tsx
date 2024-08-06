import { IconButton } from '@/components/shared/IconButton'
import { Pen } from '@/components/icons/Pen'
import { FilePen } from '@/components/icons/FilePen'
import { MouseEvent, useCallback } from 'react'
import { VideoCamera } from '@/components/icons/VideoCamera'
import { useDashboardNotesContext } from '@/components/DashboardNotesProvider'
import { generateId } from '@/components/shared/utils'
import { useSelf } from '@/components/WebRTCProvider'

export interface DashboardControlsProps {
  selectedControl: DashboardControl | null
  onSelectControl: (control: DashboardControl | null, event: MouseEvent<HTMLButtonElement>) => void
}

export type DashboardControl = 'pen' | 'note' | 'video'

export function DashboardControls(props: DashboardControlsProps) {
  const { selectedControl, onSelectControl } = props
  const { createNote } = useDashboardNotesContext()
  const self = useSelf()
  const user = self.user
  const handleNoteClick = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    createNote({
      type: 'text',
      id: generateId(),
      isDraft: true,
      width: 256,
      height: 224,
      content: '',
      mode: 'edit',
      author: { ...user },
      attachments: [],
    }, [event.clientX, event.clientY])
  }, [user, createNote])
  const handleVideoClick = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    createNote({
      type: 'video',
      id: generateId(),
      isDraft: true,
      width: 256,
      height: 224,
      content: '',
      mode: 'edit',
      author: { ...user },
      attachments: [],
    }, [event.clientX, event.clientY])
  }, [user, createNote])

  return (
    <div className="flex flex-col justify-center absolute right-0 h-full px-4">
      <div className="flex flex-col gap-4 justify-center">
        <IconButton isActive={selectedControl === 'pen'} value="pen" onClick={e => onSelectControl('pen', e)}>
          <Pen/>
        </IconButton>

        <IconButton isActive={selectedControl === 'note'} value="note" onClick={handleNoteClick}>
          <FilePen/>
        </IconButton>

        <IconButton isActive={selectedControl === 'video'} value="video" onClick={handleVideoClick}>
          <VideoCamera/>
        </IconButton>
      </div>
    </div>
  )
}
