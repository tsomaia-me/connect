import { Note } from '@/components/DashboardNotes'
import { getAbsolutePoint, getRelativePoint } from '@/components/shared/utils'
import classNames from 'classnames'
import { Box, Point } from '@/components/shared/types'
import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react'
import { User } from '@/app.models'
import { HDots } from '@/components/icons/HDots'
import { Bin } from '@/components/icons/Bin'

export interface StickyNoteProps {
  user: User
  box: Box
  note: Note
  onNoteChange: (note: Note, updateOnlyPeers?: boolean) => void
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
  const [isMoving, setIsMoving] = useState(false)
  const noteRef = useRef<Note>(note)
  const noteElRef = useRef<HTMLDivElement | null>(null)
  const moveHandleRef = useRef<HTMLButtonElement | null>(null)

  noteRef.current = note

  const handleMoveDown = useCallback(() => {
    setIsMoving(true)
  }, [])
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
    if (!isMoving && user.id === note.author.id && note.mode === 'edit' && textareaRef.current) {
      textareaRef.current!.focus()
    }
  }, [isMoving, user, note.mode])

  useEffect(() => {
    if (!isMoving || !noteElRef.current) {
      return
    }

    const noteEl = noteElRef.current!

    function setPosition([x, y]) {
      const left = x - (noteEl.offsetWidth / 2)
      const top = y - (moveHandleRef.current!.offsetTop + (moveHandleRef.current!.offsetHeight / 2))
      noteEl.style.left = `${left}px`
      noteEl.style.top = `${top}px`
    }

    function onMouseMove(event: MouseEvent) {
      const point = [event.clientX, event.clientY]
      setPosition(point)
      onNoteChange({
        ...noteRef.current,
        relativePoint: getRelativePoint(point as Point, box),
      }, true)
    }

    function onMouseUp() {
      setIsMoving(false)
      onNoteChange(noteRef.current)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)

    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [isMoving])

  return (
    <div
      ref={noteElRef}
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
        <button
          ref={moveHandleRef}
          className={classNames(user.id === note.author.id ? 'cursor-grab' : 'cursor-not-allowed')}
          onMouseDown={handleMoveDown}
        >
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
