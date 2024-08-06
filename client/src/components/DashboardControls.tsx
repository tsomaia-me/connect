import { IconButton } from '@/components/shared/IconButton'
import { Pen } from '@/components/icons/Pen'
import { FilePen } from '@/components/icons/FilePen'
import { MouseEvent, useCallback } from 'react'
import { useDashboardNotesContext } from '@/components/DashboardNotesProvider'
import { generateId } from '@/components/shared/utils'
import { useSelf } from '@/components/WebRTCProvider'
import { PenColorPicker } from '@/components/PenColorPicker'
import { PenSizePicker } from '@/components/PenSizePicker'

export interface DashboardControlsProps {
  selectedControl: DashboardControl | null
  selectedColor: string
  selectedSize: number
  onSelectControl: (control: DashboardControl | null, event: MouseEvent<HTMLButtonElement>) => void
  onSelectSize: (size: number) => void
  onSelectColor: (color: string) => void
}

export type DashboardControl = 'pen' | 'note' | 'video'

export function DashboardControls(props: DashboardControlsProps) {
  const { selectedControl, selectedSize, selectedColor, onSelectControl, onSelectSize, onSelectColor } = props
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

  // const handleVideoClick = useCallback((event: MouseEvent<HTMLButtonElement>) => {
  //   createNote({
  //     type: 'video',
  //     id: generateId(),
  //     isDraft: true,
  //     width: 256,
  //     height: 224,
  //     content: '',
  //     mode: 'edit',
  //     author: { ...user },
  //     attachments: [],
  //   }, [event.clientX, event.clientY])
  // }, [user, createNote])

  return (
    <div className="flex flex-col justify-center absolute right-0 h-full px-4">
      <div className="flex flex-col gap-4 justify-between items-center h-full py-24">
        <div className="h-[160px] mb-4">
          <PenSizePicker
            isOpen={selectedControl === 'pen'}
            selectedSize={selectedSize}
            onSelectSize={onSelectSize}
          ></PenSizePicker>
        </div>

        <div className="flex flex-col gap-4 justify-center items-center">
          <IconButton isActive={selectedControl === 'note'} value="note" onClick={handleNoteClick}>
            <FilePen/>
          </IconButton>

          <IconButton isActive={selectedControl === 'pen'} value="pen"
                      onClick={e => onSelectControl(selectedControl === 'pen' ? null : 'pen', e)}>
            <Pen/>
          </IconButton>
        </div>

        <div className="h-[320px] mt-4">
          <PenColorPicker
            isOpen={selectedControl === 'pen'}
            selectedColor={selectedColor}
            onSelectColor={onSelectColor}
          />
        </div>

        {/*<IconButton isActive={selectedControl === 'video'} value="video" onClick={handleVideoClick}>*/}
        {/*  <VideoCamera/>*/}
        {/*</IconButton>*/}
      </div>
    </div>
  )
}
