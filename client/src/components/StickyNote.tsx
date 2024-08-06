import { generateId, getAbsolutePoint, getRelativePoint } from '@/components/shared/utils'
import classNames from 'classnames'
import { Note, Point } from '@/components/shared/types'
import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { User } from '@/app.models'
import { HDots } from '@/components/icons/HDots'
import { useDashboardNotesContext } from '@/components/DashboardNotesProvider'
import { useSelf } from '@/components/WebRTCProvider'
import { StickyNoteVideo } from '@/components/StickyNoteVideo'
import { StickyNoteText } from '@/components/StickyNoteText'

export interface StickyNoteProps {
  user: User
  note: Note
}

export function StickyNote(props: StickyNoteProps) {
  const { user, note } = props
  const {
    containerSize,
    updateNote,
    removeNote,
    downloadAttachment,
    loadAttachment
  } = useDashboardNotesContext()
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const moveHandleRef = useRef<HTMLButtonElement | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)
  const noteRef = useRef<Note>(note)
  const relativePoint = note.relativePoint
  const userId = user.id
  const noteId = note.id
  const noteAuthorId = note.author.id
  const isAuthor = userId === noteAuthorId
  const noteAttachments = note.attachments
  const loadAttachmentRef = useRef(loadAttachment)

  noteRef.current = note
  loadAttachmentRef.current = loadAttachment

  const notePosition = useMemo(() => {
    const absolutePoint = getAbsolutePoint(note.relativePoint, containerSize)
    const left = absolutePoint[0] - (note.width / 2)
    const top = absolutePoint[1] - 40

    return { left, top }
  }, [relativePoint, containerSize])

  const enableMoving = useNoteMoveHandler(note, () => {
    if (noteRef.current.isDraft && textareaRef.current) {
      textareaRef.current!.focus()
    }
  })

  const handleMoveDown = useCallback(() => {
    if (isAuthor) {
      enableMoving()
    }
  }, [isAuthor, enableMoving])

  const handleNoteContentChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => {
    if (!isAuthor) {
      return
    }

    updateNote({
      id: noteId,
      content: (event.nativeEvent.target as HTMLTextAreaElement).value,
    })

    if (textareaRef.current) {
      const textarea = textareaRef.current!
      const scrollHeight = textarea.scrollHeight ?? 0

      if (scrollHeight > 224) {
        textarea.style.height = `${scrollHeight}px`
      }
    }
  }, [isAuthor, noteId, updateNote])

  const handleNoteDelete = useCallback(() => {
    if (isAuthor) {
      removeNote(note.id)
    }
  }, [isAuthor, note, removeNote])

  const handleAttachClick = useCallback(() => {
    if (isAuthor && fileRef.current) {
      fileRef.current!.click()
    }
  }, [isAuthor])

  const handleDownloadAttachmentClick = useCallback((attachmentId: string) => {
    downloadAttachment(noteId, attachmentId)
  }, [noteId, downloadAttachment])

  const handleFileChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = (event.target as HTMLInputElement)?.files?.[0]
    const id = generateId()

    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('Max file size is 10 MB')
        return
      }

      updateNote({
        id: noteId,
        attachments: [
          ...noteAttachments,
          {
            id,
            name: file.name,
            type: file.type,
            size: file.size,
            isPrimary: false,
          },
        ],
      })

      const fileReader = new FileReader()
      fileReader.onload = event => {
        if (event.target) {
          loadAttachmentRef.current(id, event.target!.result as ArrayBuffer)
        }
      }
      fileReader.readAsArrayBuffer(file)
    }
  }, [noteId, noteAttachments, updateNote])

  return (
    <div
      className={
        classNames(
          'flex flex-col absolute bg-gray-600 rounded-2xl w-64 pointer-events-auto shadow-md',
          note.type === 'video' ? 'min-h-64' : 'min-h-56',
        )
      }
      style={notePosition}
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

      {note.type === 'text' && (
        <StickyNoteText
          note={note}
          isAuthor={isAuthor}
          textareaRef={textareaRef}
          onContentChange={handleNoteContentChange}
          onAttachClick={handleAttachClick}
          onDownloadAttachmentClick={handleDownloadAttachmentClick}
          onDeleteClick={handleNoteDelete}
        />
      )}

      {note.type === 'video' && (
        <StickyNoteVideo
          user={user}
          note={note}
          isAuthor={isAuthor}
          onDeleteClick={handleNoteDelete}
        />
      )}


      <input
        ref={fileRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}

function useNoteMoveHandler(note: Note, onDrop: () => void) {
  const self = useSelf()
  const { containerSize, updateNote } = useDashboardNotesContext()
  const [isMoving, setIsMoving] = useState(note.isDraft && note.author.id === self.user.id)
  const noteId = note.id

  useEffect(() => {
    if (!isMoving) {
      return
    }

    function onMouseMove(event: MouseEvent) {
      const point = [event.clientX, event.clientY] as Point
      updateNote({
        id: noteId,
        relativePoint: getRelativePoint(point, containerSize),
      })
    }

    function onMouseUp(event: MouseEvent) {
      const point = [event.clientX, event.clientY] as Point
      setIsMoving(false)

      setTimeout(() => {
        updateNote({
          id: noteId,
          isDraft: false,
          relativePoint: getRelativePoint(point, containerSize),
        })
      })

      onDrop()
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)

    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [noteId, isMoving, updateNote, containerSize, onDrop])

  return useCallback(() => setIsMoving(true), [])
}
