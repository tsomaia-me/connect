import { Note } from '@/components/shared/types'
import { ChangeEvent, MutableRefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDashboardNotesContext } from '@/components/DashboardNotesProvider'
import { getFormattedFileSize } from '@/components/shared/utils'
import { Spinner } from '@/components/icons/Spinner'
import { Download } from '@/components/icons/Download'
import classNames from 'classnames'
import { Paperclip } from '@/components/icons/Paperclip'
import { Bin } from '@/components/icons/Bin'

export interface StickyNoteTextProps {
  note: Note
  isAuthor: boolean
  textareaRef: MutableRefObject<HTMLTextAreaElement | null>
  onContentChange: (event: ChangeEvent<HTMLTextAreaElement>) => void
  onAttachClick: () => void
  onDownloadAttachmentClick: (attachmentId: string) => void
  onDeleteClick: () => void
}

export function StickyNoteText(props: StickyNoteTextProps) {
  const { note, isAuthor, textareaRef, onContentChange, onAttachClick, onDownloadAttachmentClick, onDeleteClick } = props
  const { attachmentStates } = useDashboardNotesContext()

  return (
    <div className="flex flex-col w-full h-full flex-1">
      <textarea
        ref={textareaRef}
        className="bg-transparent w-full flex-1 min-h-56 p-6 pt-2 focus:outline-none focus:ring-0 border-0 resize-none text-xl text-white overflow-hidden"
        value={note.content ?? ''}
        readOnly={!isAuthor}
        onChange={onContentChange}
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
              <button onClick={() => onDownloadAttachmentClick(attachment.id)}>
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
              isAuthor ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
            )
          } onClick={onAttachClick}>
            <Paperclip/>
          </button>

          <button className={
            classNames(
              isAuthor ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
            )
          } onClick={onDeleteClick}>
            <Bin/>
          </button>
        </div>
      </div>
    </div>
  )
}
