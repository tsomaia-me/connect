import { Note } from '@/components/DashboardNotes'
import { getAbsolutePoint } from '@/components/shared/utils'
import classNames from 'classnames'
import { Box, Point } from '@/components/shared/types'
import { ChangeEvent, useCallback, useEffect, useRef } from 'react'
import { User } from '@/app.models'
import { HDots } from '@/components/icons/HDots'
import { Bin } from '@/components/icons/Bin'

export interface StickyNoteProps {
  user: User
  box: Box
  note: Note
  onNoteChange: (note: Note) => void
  onNoteDelete: (noteId: string) => void
}

export interface Note {
  id: string
  width: number
  height: number
  relativePoint: Point
  content: string
  mode: 'edit' | 'view'
  author: User
}

export function StickyNote(props: StickyNoteProps) {
  const { user, box, note, onNoteChange, onNoteDelete } = props
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const handleNoteContentChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => {
    if (user.id !== note.author.id) {
      return
    }

    onNoteChange({
      ...note,
      content: (event.nativeEvent.target as HTMLTextAreaElement).value,
    })

    if (textareaRef.current) {
      const textarea = textareaRef.current!
      const scrollHeight = textarea.scrollHeight ?? 0

      if (scrollHeight > 224) {
        textarea.style.height = `${scrollHeight}px`
      }
    }
  }, [user, note, onNoteChange])
  const handleNoteDelete = useCallback(() => {
    if (user.id === note.author.id) {
      onNoteDelete(note.id)
    }
  }, [user, note, onNoteDelete])
  const handleNoteFocus = useCallback(() => {
    onNoteChange({
      ...note,
      mode: 'edit',
    })
  }, [note, onNoteChange])
  const handleNoteBlur = useCallback(() => {
    onNoteChange({
      ...note,
      mode: 'view',
    })
  }, [note, onNoteChange])

  useEffect(() => {
    if (user.id === note.author.id && note.mode === 'edit' && textareaRef.current) {
      textareaRef.current!.focus()
    }
  }, [user, note.mode])

  return (
    <div
      className={
        classNames(
          'absolute bg-gray-600 border border-gray-700 rounded-2xl w-56 min-h-56 pointer-events-auto shadow-md',
        )
      }
      style={{
        left: getAbsolutePoint(note.relativePoint, box)[0] - (note.width / 2),
        top: getAbsolutePoint(note.relativePoint, box)[1] - (note.height / 2),
      }}
    >
      <div className="flex justify-center">
        <button className={classNames(user.id === note.author.id ? 'cursor-grab' : 'cursor-not-allowed')}>
          <HDots/>
        </button>
      </div>

      <textarea
        ref={textareaRef}
        className="bg-transparent w-full min-h-56 p-6 pt-2 focus:outline-none focus:ring-0 border-0 resize-none text-xl text-white overflow-hidden"
        value={note.content}
        readOnly={user.id !== note.author.id}
        onFocus={handleNoteFocus}
        onChange={handleNoteContentChange}
        onBlur={handleNoteBlur}
      />

      <div className="flex justify-between items-center px-2 pb-2">
        <div className="pl-2 text-gray-400">
          {note.author.username}
        </div>

        <div>
          <button className={
            classNames(
              user.id === note.author.id ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
            )
          } onClick={handleNoteDelete}>
            <Bin/>
          </button>
        </div>
      </div>
    </div>
  )
}
