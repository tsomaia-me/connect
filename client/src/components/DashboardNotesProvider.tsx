import {
  createContext, Dispatch,
  MutableRefObject,
  PropsWithChildren, SetStateAction,
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
  content: ArrayBuffer | Blob | null
}

export interface NoteEventsHandlerProps {
  containerSize: Box
  notes: Note[]
  attachmentStates: Record<string, AttachmentState>
  createNote: (note: Partial<Note>, initialPoint: Point) => void
  updateNote: (note: UpdateNote) => void
  removeNote: (id: string) => void
  receiveExistingNotes: (notes: Note[], attachmentStates: Record<string, AttachmentState>) => void
  receiveNewNote: (note: Note) => void
  receiveUpdatedNote: (note: UpdateNote) => void
  receiveRemovedNote: (id: string) => void
  downloadAttachment: (noteId: string, attachmentId: string) => void
  loadAttachment: (attachmentId: string, content: ArrayBuffer | Blob | null) => void
}

const DashboardNotesContext = createContext<NoteEventsHandlerProps>({
  containerSize: { width: 0, height: 0 } as Box,
  notes: [] as Note[],
  attachmentStates: {} as Record<string, AttachmentState>,
  createNote: (note: Partial<Note>, initialPoint: Point) => {
  },
  updateNote: (note: UpdateNote) => {
  },
  removeNote: (id: string) => {
  },
  receiveExistingNotes: (notes: Note[], attachmentStates: Record<string, AttachmentState>) => {
  },
  receiveNewNote: (note: Note) => {
  },
  receiveUpdatedNote: (note: UpdateNote) => {
  },
  receiveRemovedNote: (id: string) => {
  },
  downloadAttachment: (noteId: string, attachmentId: string) => {
  },
  loadAttachment: (attachmentId: string, content: ArrayBuffer | Blob | null) => {
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
  const [attachmentStates, setAttachmentStates] = useState<Record<string, AttachmentState>>({})
  const notesRef = useRef<Note[]>(notes)

  notesRef.current = notes

  const updateAttachment = useCallback((attachmentId: string, map: (attachmentState: AttachmentState) => Partial<AttachmentState>) => {
    setAttachmentStates(attachmentStates => {
      const existingAttachmentState = attachmentStates[attachmentId]

      if (!existingAttachmentState) {
        return attachmentStates
      }

      return {
        ...attachmentStates,
        [existingAttachmentState.id]: {
          ...existingAttachmentState,
          ...map(existingAttachmentState),
        }
      } as Record<string, AttachmentState>
    })
  }, [])

  const syncAttachments = useCallback((note?: Note | UpdateNote, isRemote = false) => {
    const selectedNotes = note ? [note] : notesRef.current

    if (!note || note?.attachments?.length) {
      setAttachmentStates(attachmentStates => {
        const clonedAttachmentStates = { ... attachmentStates }

        for (const note of selectedNotes) {
          const noteAttachments = note.attachments

          if (noteAttachments?.length) {
            noteAttachments.forEach(attachment => {
              const existingAttachment = clonedAttachmentStates[attachment.id]
              clonedAttachmentStates[attachment.id] = {
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

        return clonedAttachmentStates
      })
    }
  }, [])

  const removeAttachments = useCallback((ids: string[]) => {
    setAttachmentStates(attachmentStates => {
      const clonedAttachmentStates = { ... attachmentStates }

      for (const id of ids) {
        delete clonedAttachmentStates[id]
      }

      return clonedAttachmentStates
    })
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

  const receiveExistingNotes = useCallback((notes: Note[], attachmentStates: Record<string, AttachmentState>) => {
    setNotes(notes)
    console.log('received attachmentStates', attachmentStates)
    setAttachmentStates(
      Object.keys(attachmentStates).reduce((red, key) => ({
        ...red,
        [key]: {
          ...attachmentStates[key],
          status: attachmentStates[key].status === 'local' ? 'placeholder' : attachmentStates[key].status,
        },
      }), {})
    )
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
    const attachmentState = attachmentStates[attachmentId]

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
  }, [attachmentStates, peers, send])

  const loadAttachment = useCallback((attachmentId: string, content: ArrayBuffer | Blob | null) => {
    setAttachmentStates(attachmentStates => {
      const clonedAttachmentStates = attachmentStates
      const attachmentState = attachmentStates[attachmentId]

      if (attachmentState) {
        clonedAttachmentStates[attachmentId] = {
          ...attachmentState,
          content,
        }
      }

      return clonedAttachmentStates
    })
  }, [])

  const contextValue = useMemo(() => ({
    containerSize,
    notes,
    attachmentStates,
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
    attachmentStates,
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

  useNoteEventsHandler(contextValue, attachmentStates, updateAttachment)

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
  attachmentStates: Record<string, AttachmentState>,
  updateAttachment: (attachmentId: string, map: (prev: AttachmentState) => Partial<AttachmentState>) => void,
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
  const attachmentsRef = useRef(attachmentStates)

  containerSizeRef.current = containerSize
  notesRef.current = notes
  attachmentsRef.current = attachmentStates

  useEffect(() => {
    function onPeerJoined(event: PeerEvent) {
      if (notesRef.current.length > 0) {
        send(event.peerId, {
          event: 'notes',
          payload: {
            notes: notesRef.current,
            attachmentStates: attachmentsRef.current,
          },
        })
      }
    }

    function onReceivedNotes(event: PeerEvent) {
      console.log('Receives notes')
      const notes = event.payload.notes as Note[]
      const attachmentStates = event.payload.attachmentStates as Record<string, AttachmentState>
      receiveExistingNotes(notes, attachmentStates)
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
      console.log(`received chunk #${i}`)

      if (finished) {
        updateAttachment(attachmentId, state => {
          const base64 = (state.partialContent ?? '') + chunk
          const buffer = base64ToArrayBuffer(base64)
          download(state.attachment, buffer)

          return {
            status: 'downloaded',
            partialContent: null,
            content: base64ToArrayBuffer(base64),
          }
        })
      } else {
        updateAttachment(attachmentId, state => ({
          status: 'downloading',
          partialContent: (state.partialContent ?? '') + chunk,
        }))
      }
    }

    function onReceiveAttachmentError(event: PeerEvent) {
      const { attachmentId, error } = event.payload

      updateAttachment(attachmentId, () => ({
        status: 'failed',
        error,
      }))
      alert(error)
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
    updateAttachment,
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

