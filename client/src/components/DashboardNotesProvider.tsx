import {
  createContext,
  MutableRefObject,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'
import { Attachment, Box, Note, Point, UpdateNote } from '@/components/shared/types'
import {
  arrayBufferToBase64,
  base64ToArrayBuffer,
  download,
  generateId,
  getChunks,
  getRelativePoint
} from '@/components/shared/utils'
import { PeerEvent, useWebRTCContext } from '@/components/WebRTCProvider'

export interface DashboardNotesProviderProps extends PropsWithChildren {

}

export interface AttachmentState {
  id: string
  attachment: Attachment
  status: 'local' | 'placeholder' | 'downloading' | 'downloaded' | 'failed'
  error: string | null
  partialContent: string | null
  content: ArrayBuffer | null
}

export interface NoteEventsHandlerProps {
  containerSize: Box
  notes: Note[]
  createNote: (note: Partial<Note>, initialPoint: Point) => void
  updateNote: (note: UpdateNote) => void
  removeNote: (id: string) => void
  receiveExistingNotes: (notes: Note[]) => void
  receiveNewNote: (note: Note) => void
  receiveUpdatedNote: (note: UpdateNote) => void
  receiveRemovedNote: (id: string) => void
  downloadAttachment: (noteId: string, attachmentId: string) => void
  loadAttachment: (attachmentId: string, content: ArrayBuffer) => void
}

const DashboardNotesContext = createContext<NoteEventsHandlerProps>({
  containerSize: { width: 0, height: 0 } as Box,
  notes: [] as Note[],
  createNote: (note: Partial<Note>, initialPoint: Point) => {
  },
  updateNote: (note: UpdateNote) => {
  },
  removeNote: (id: string) => {
  },
  receiveExistingNotes: (notes: Note[]) => {
  },
  receiveNewNote: (note: Note) => {
  },
  receiveUpdatedNote: (note: UpdateNote) => {
  },
  receiveRemovedNote: (id: string) => {
  },
  downloadAttachment: (noteId: string, attachmentId: string) => {
  },
  loadAttachment: (attachmentId: string, content: ArrayBuffer) => {
  },
})

export function useDashboardNotesContext() {
  return useContext(DashboardNotesContext)
}

export function DashboardNotesProvider(props: DashboardNotesProviderProps) {
  const { children } = props
  const { self, peers, send, broadcast } = useWebRTCContext()
  const user = self.user
  const [notes, setNotes] = useState<Note[]>([])
  const [notesContainer, setNotesContainer] = useState<HTMLDivElement | null>(null)
  const containerSize = useContainerSize(notesContainer)
  const attachmentsRef = useRef<Record<string, AttachmentState>>({})
  const notesRef = useRef<Note[]>(notes)

  notesRef.current = notes

  const syncAttachments = useCallback((note?: Note | UpdateNote, isRemote = false) => {
    const selectedNotes = note ? [note] : notesRef.current

    if (!note || note?.attachments?.length) {
      for (const note of selectedNotes) {
        const noteAttachments = note.attachments

        if (noteAttachments?.length) {
          noteAttachments.forEach(attachment => {
            const existingAttachment = attachmentsRef.current[attachment.id]
            attachmentsRef.current[attachment.id] = {
              id: attachment.id,
              attachment,
              status: existingAttachment?.status ?? (isRemote ? 'placeholder' : 'local'),
              error: null,
              partialContent: null,
              content: null,
            }
          })
        }
      }
    }
  }, [])

  const removeAttachments = useCallback((ids: string[]) => {
    for (const id of ids) {
      delete attachmentsRef.current[id]
    }
  }, [])

  const createNote = useCallback((draft: Partial<Note>, initialPoint: Point) => {
    const note: Note = {
      type: 'text',
      id: generateId(),
      isDraft: true,
      width: 256,
      height: 224,
      relativePoint: getRelativePoint(initialPoint, {
        width: containerSize.width,
        height: containerSize.height,
      }),
      content: '',
      mode: 'edit',
      author: { ...user },
      attachments: [],
      ...draft,
    }

    const existingOwnDrafts = notes.filter(n => n.isDraft).map(n => n.id)

    broadcast({
      event: 'notecreated',
      payload: {
        note,
      },
    })
    existingOwnDrafts.forEach(id => {
      broadcast({
        event: 'noteremoved',
        payload: {
          id,
        },
      })
    })

    setNotes(notes => [
      ...notes.filter(n => !existingOwnDrafts.includes(n.id)),
      note,
    ])
    syncAttachments(note)
  }, [containerSize, user, notes, syncAttachments, broadcast])

  const updateNote = useCallback((note: UpdateNote) => {
    setNotes(notes => notes.map(n => n.id === note.id ? { ...n, ...note } : n))
    syncAttachments(note)

    broadcast({
      event: 'noteupdated',
      payload: {
        note,
      },
    })
  }, [broadcast])

  const removeNote = useCallback((id: string) => {
    const node = notesRef.current.find(n => n.id === id)
    setNotes(notes => notes.filter(n => n.id !== id))

    if (node.attachments?.length) {
      removeAttachments(node.attachments.map(a => a.id))
    }

    broadcast({
      event: 'noteremoved',
      payload: {
        id,
      },
    })
  }, [syncAttachments, broadcast])

  const receiveExistingNotes = useCallback((notes: Note[]) => {
    setNotes(notes)
    syncAttachments(undefined, true)
  }, [syncAttachments])

  const receiveNewNote = useCallback((note: Note) => {
    setNotes(notes => notes.map(n => n.id).includes(note.id)
      ? notes.map(n => n.id === note.id ? note : n)
      : [...notes, note])
    syncAttachments(note, true)
  }, [syncAttachments])

  const receiveUpdatedNote = useCallback((note: Note) => {
    setNotes(notes => notes.map(n => n.id === note.id ? { ...n, ...note } : n))
    syncAttachments(note, true)
  }, [syncAttachments])

  const receiveRemovedNote = useCallback((id: string) => {
    const node = notesRef.current.find(n => n.id === id)
    setNotes(notes => notes.filter(n => n.id !== id))

    if (node.attachments?.length) {
      removeAttachments(node.attachments.map(a => a.id))
    }
  }, [syncAttachments])

  const downloadAttachment = useCallback((noteId: string, attachmentId: string) => {
    const attachmentState = attachmentsRef.current[attachmentId]

    if (attachmentState?.content) {
      download(attachmentState.attachment, attachmentState.content)
    } else if (attachmentState?.status === 'placeholder' || attachmentState?.status === 'failed') {
      const note = notesRef.current.find(note => note.id === noteId)
      const attachmentConnectionId = peers.find(p => p.participant.user.id === note.author.id)?.connectionId
      console.log('requesting download', noteId, note, attachmentConnectionId)

      if (attachmentConnectionId && note) {
        send(attachmentConnectionId, {
          event: 'downloadattachment',
          payload: {
            noteId,
            attachmentId,
          },
        })
      }
    } else {
      alert('Attachment is not ready to download yet, please try again later')
    }
  }, [peers, send])

  const loadAttachment = useCallback((attachmentId: string, content: ArrayBuffer) => {
    const attachmentState = attachmentsRef.current[attachmentId]

    if (attachmentState) {
      attachmentsRef.current[attachmentId] = {
        ...attachmentState,
        content,
      }
    }
  }, [])

  const contextValue = useMemo(() => ({
    containerSize,
    notes,
    createNote,
    updateNote,
    removeNote,
    receiveExistingNotes,
    receiveNewNote,
    receiveUpdatedNote,
    receiveRemovedNote,
    downloadAttachment,
    loadAttachment,
  }), [
    containerSize,
    notes,
    createNote,
    updateNote,
    removeNote,
    receiveExistingNotes,
    receiveNewNote,
    receiveUpdatedNote,
    receiveRemovedNote,
    downloadAttachment,
    loadAttachment,
  ])

  useNoteEventsHandler(contextValue, attachmentsRef)

  return (
    <div ref={setNotesContainer} className="w-full h-full">
      <DashboardNotesContext.Provider value={contextValue}>
        {children}
      </DashboardNotesContext.Provider>
    </div>
  )
}

function useNoteEventsHandler(
  context: NoteEventsHandlerProps,
  attachmentsRef: MutableRefObject<Record<string, AttachmentState>>,
) {
  const { send, addPeerEventListener, removePeerEventListener } = useWebRTCContext()
  const {
    containerSize,
    notes,
    receiveExistingNotes,
    receiveNewNote,
    receiveUpdatedNote,
    receiveRemovedNote
  } = context
  const containerSizeRef = useRef(containerSize)
  const notesRef = useRef<Note[]>(notes)

  containerSizeRef.current = containerSize
  notesRef.current = notes

  useEffect(() => {
    function onPeerJoined(event: PeerEvent) {
      if (notesRef.current.length > 0) {
        send(event.peerId, {
          event: 'notes',
          payload: {
            notes: notesRef.current,
          },
        })
      }
    }

    function onReceivedNotes(event: PeerEvent) {
      console.log('Receives notes')
      const notes = event.payload.notes as Note[]
      receiveExistingNotes(notes)
    }

    function onNoteCreated(event: PeerEvent) {
      const note = event.payload.note as Note
      receiveNewNote(note)
    }

    function onNoteUpdated(event: PeerEvent) {
      const note = event.payload.note as UpdateNote
      receiveUpdatedNote(note)
    }

    function onNoteRemoved(event: PeerEvent) {
      const id = event.payload.id as string
      receiveRemovedNote(id)
    }

    function onDownloadAttachment(event: PeerEvent) {
      const { noteId, attachmentId } = event.payload
      const attachmentMetadata = attachmentsRef.current[attachmentId]

      console.log('download attachment')

      if (!attachmentMetadata) {
        send(event.peerId, {
          event: 'receiveattachmenterror',
          payload: {
            noteId,
            attachmentId,
            error: 'Attachment not found',
          },
        })
      } else if (attachmentMetadata.status !== 'local') { // todo: maybe remove
        send(event.peerId, {
          event: 'receiveattachmenterror',
          payload: {
            noteId,
            attachmentId,
            error: 'Attachment is owned by another peer',
          },
        })
      } else if (!attachmentMetadata.content) {
        send(event.peerId, {
          event: 'receiveattachmenterror',
          payload: {
            noteId,
            attachmentId,
            error: 'Attachment is not ready to download yet, please try again later',
          },
        })
      } else {
        const peerId = event.peerId
        const chunkSize = 16384 // 16 KB
        const base64 = arrayBufferToBase64(attachmentMetadata.content)

        for (const { i, chunk, finished } of getChunks(base64, chunkSize)) {
          send(peerId, {
            event: 'receiveattachmentchunk',
            payload: {
              i,
              noteId,
              attachmentId,
              chunk,
              finished,
            },
          })
        }
      }
    }

    function onReceiveAttachmentChunk(event: PeerEvent) {
      const { attachmentId, i, chunk, finished } = event.payload
      const attachmentMetadata = attachmentsRef.current[attachmentId]
      console.log(`received chunk #${i}`)

      if (!attachmentMetadata) {
        return
      }

      if (finished) {
        const base64 = (attachmentMetadata.partialContent ?? '') + chunk
        const buffer = base64ToArrayBuffer(base64)
        attachmentsRef.current[attachmentId] = {
          ...attachmentMetadata,
          status: 'downloaded',
          partialContent: null,
          content: base64ToArrayBuffer(base64),
        }
        download(attachmentMetadata.attachment, buffer)
      } else {
        attachmentsRef.current[attachmentId] = {
          ...attachmentMetadata,
          status: 'downloaded',
          partialContent: (attachmentMetadata.partialContent ?? '') + chunk,
        }
      }
    }

    function onReceiveAttachmentError(event: PeerEvent) {
      const { attachmentId, error } = event.payload
      const attachmentMetadata = attachmentsRef.current[attachmentId]

      if (attachmentMetadata) {
        attachmentsRef.current[attachmentId] = {
          ...attachmentMetadata,
          status: 'failed',
          error,
        }
        alert(error)
      }
    }

    addPeerEventListener('joined', onPeerJoined)
    addPeerEventListener('notes', onReceivedNotes)
    addPeerEventListener('notecreated', onNoteCreated)
    addPeerEventListener('noteupdated', onNoteUpdated)
    addPeerEventListener('noteremoved', onNoteRemoved)
    addPeerEventListener('downloadattachment', onDownloadAttachment)
    addPeerEventListener('receiveattachmentchunk', onReceiveAttachmentChunk)
    addPeerEventListener('receiveattachmenterror', onReceiveAttachmentError)

    return () => {
      removePeerEventListener('joined', onPeerJoined)
      removePeerEventListener('notes', onReceivedNotes)
      removePeerEventListener('notecreated', onNoteCreated)
      removePeerEventListener('noteupdated', onNoteUpdated)
      removePeerEventListener('noteremoved', onNoteRemoved)
      removePeerEventListener('downloadattachment', onDownloadAttachment)
      removePeerEventListener('receiveattachmentchunk', onReceiveAttachmentChunk)
      removePeerEventListener('receiveattachmenterror', onReceiveAttachmentError)
    }
  }, [
    send,
    addPeerEventListener,
    removePeerEventListener,
    receiveExistingNotes,
    receiveNewNote,
    receiveUpdatedNote,
    receiveRemovedNote,
  ])
}

function useContainerSize(notesContainer: HTMLElement | null) {
  const [containerSize, setContainerSize] = useState<Box>({ width: 0, height: 0 })

  useEffect(() => {
    if (!notesContainer) {
      return
    }

    setContainerSize({
      width: notesContainer.offsetWidth,
      height: notesContainer.offsetHeight,
    })

    function onResize() {
      if (notesContainer) {
        setContainerSize({
          width: notesContainer.offsetWidth,
          height: notesContainer.offsetHeight,
        })
      }
    }

    window.addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('resize', onResize)
    }
  }, [notesContainer])

  return containerSize
}

