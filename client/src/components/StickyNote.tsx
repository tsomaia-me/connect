import { generateId, getAbsolutePoint, getFormattedFileSize, getRelativePoint } from '@/components/shared/utils'
import classNames from 'classnames'
import { Note, Point } from '@/components/shared/types'
import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { User } from '@/app.models'
import { HDots } from '@/components/icons/HDots'
import { Bin } from '@/components/icons/Bin'
import { Paperclip } from '@/components/icons/Paperclip'
import { Download } from '@/components/icons/Download'
import { useDashboardNotesContext } from '@/components/DashboardNotesProvider'
import { useSelf } from '@/components/WebRTCProvider'
import { Spinner } from '@/components/icons/Spinner'

export interface StickyNoteProps {
  user: User
  note: Note
}

export function StickyNote(props: StickyNoteProps) {
  const { user, note } = props
  const {
    containerSize,
    attachmentStates,
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
    if (isAuthor) {
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
            file,
            name: file.name,
            type: file.type,
            size: file.size,
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
          'absolute bg-gray-600 border border-gray-700 rounded-2xl w-64 min-h-56 pointer-events-auto shadow-md',
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

      <textarea
        ref={textareaRef}
        className="bg-transparent w-full min-h-56 p-6 pt-2 focus:outline-none focus:ring-0 border-0 resize-none text-xl text-white overflow-hidden"
        value={note.content ?? ''}
        readOnly={!isAuthor}
        onChange={handleNoteContentChange}
      />

      <div className="mb-4 border-b border-gray-400">
        {note.attachments.map(attachment => (
          <div key={attachment.id}
               className="flex justify-between items-center p-4 text-white text-sm max-w-full overflow-hidden gap-2">
            <div className="truncate text-ellipsis">{attachment.name}</div>
            <div className="flex justify-end items-center gap-2">
              <div className="min-w-16 text-gray-400 text-right">
                {getFormattedFileSize(attachment.size)}
              </div>
              <button onClick={() => handleDownloadAttachmentClick(attachment.id)}>
                {attachmentStates[attachment.id]?.status === 'downloading' ? <Spinner/> : <Download/>}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center px-2 pb-2">
        <div className="pl-2 text-gray-400">
          {note.author.username}
        </div>

        <div className="flex justify-end items-center gap-4">
          <button className={
            classNames(
              user.id === note.author.id ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
            )
          } onClick={handleAttachClick}>
            <Paperclip/>
          </button>

          <button className={
            classNames(
              user.id === note.author.id ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
            )
          } onClick={handleNoteDelete}>
            <Bin/>
          </button>
        </div>
      </div>

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
