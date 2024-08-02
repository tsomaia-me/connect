import { useCallback, useEffect, useRef, useState } from 'react'
import { v4 as uuid } from 'uuid'
import classNames from 'classnames'
import { getRelativePoint } from '@/components/shared/utils'
import { Box, Point } from '@/components/shared/types'
import { Note, StickyNote } from '@/components/StickyNote'
import {
  PeerEvent,
  useAddPeerEventListener,
  useBroadcaster,
  useRemovePeerEventListener,
  useRoom,
  useSender,
  useUser
} from '@/components/RoomControlsProvider'
import { Room, User } from '@/app.models'

export interface DashboardNotesProps {
  isActive: boolean
  controlPosition: Point
  onNoteCreated: () => void
}

export function DashboardNotes(props: DashboardNotesProps) {
  const { isActive, controlPosition, onNoteCreated } = props
  const user = useUser()
  const room = useRoom()
  const send = useSender()
  const broadcast = useBroadcaster()
  const addPeerEventListener = useAddPeerEventListener()
  const removePeerEventListener = useRemovePeerEventListener()
  const userRef = useRef<User>(user)
  const roomRef = useRef<Room>(room)
  const sendRef = useRef(send)
  const broadcastRef = useRef(broadcast)
  const addPeerEventListenerRef = useRef(addPeerEventListener)
  const removePeerEventListenerRef = useRef(removePeerEventListener)
  const [mode, setMode] = useState<'create' | 'view'>('view')
  const boardRef = useRef<HTMLDivElement | null>(null)
  const newNoteRef = useRef<HTMLDivElement | null>(null)
  const notesRef = useRef<Note[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const box: Box = {
    width: boardRef.current?.offsetWidth ?? 0,
    height: boardRef.current?.offsetHeight ?? 0,
  }

  userRef.current = user
  sendRef.current = send
  broadcastRef.current = broadcast
  notesRef.current = notes
  addPeerEventListenerRef.current = addPeerEventListener
  removePeerEventListenerRef.current = removePeerEventListener

  const handleNoteChange = useCallback((note: Note) => {
    setNotes(notes => notes.map(n => n.id === note.id ? note : n))
    broadcast({
      event: 'noteupdated',
      payload: {
        note,
      },
    })
  }, [broadcast])

  const handleNoteDelete = useCallback((noteId: string) => {
    setNotes(notes => notes.filter(n => n.id !== noteId))
    broadcast({
      event: 'notedeleted',
      payload: {
        noteId,
      },
    })
  }, [broadcast])

  useEffect(() => {
    setMode(isActive ? 'create' : 'view')
  }, [isActive])

  useEffect(() => {
    function onPeerJoined(event: PeerEvent) {
      if (notesRef.current.length > 0) {
        console.log('sending notes to new peer:', roomRef.current.participants.find(p => p.user.id === event.peerId)?.user.username, notesRef.current)

        sendRef.current(event.peerId, {
          event: 'notes',
          payload: {
            notes: notesRef.current,
          },
        })
      }
    }

    function onNotes(event: PeerEvent) {
      const notes = event.payload.notes as Note[]
      setNotes(notes)
    }

    function onNoteCreated(event: PeerEvent) {
      console.log('note created', event)
      setNotes(existingNotes => [...existingNotes, event.payload.note as Note])
    }

    function onNoteUpdated(event: PeerEvent) {
      console.log('note updated', event)
      const note = event.payload.note as Note
      setNotes(notes => notes.map(n => n.id === note.id ? note : n))
    }

    function onNoteDeleted(event: PeerEvent) {
      console.log('note deleted', event)
      const noteId = event.payload.noteId
      setNotes(notes => notes.filter(n => n.id !== noteId))
    }

    addPeerEventListener('joined', onPeerJoined)
    addPeerEventListener('notes', onNotes)
    addPeerEventListener('notecreated', onNoteCreated)
    addPeerEventListener('noteupdated', onNoteUpdated)
    addPeerEventListener('notedeleted', onNoteDeleted)

    return () => {
      removePeerEventListener('joined', onPeerJoined)
      removePeerEventListener('notes', onNotes)
      removePeerEventListener('notecreated', onNoteCreated)
      removePeerEventListener('noteupdated', onNoteUpdated)
      removePeerEventListener('notedeleted', onNoteDeleted)
    }
  }, [addPeerEventListener, removePeerEventListener])

  useEffect(() => {
    if (mode !== 'create' || !newNoteRef.current || !boardRef.current) {
      return
    }

    const boardEl = boardRef.current!
    const newNoteEl = newNoteRef.current!
    const user = userRef.current!
    setPosition(controlPosition)

    function setPosition([x, y]) {
      const left = x - (newNoteEl.offsetWidth / 2)
      const top = y - (newNoteEl.offsetHeight / 2)
      newNoteEl.style.left = `${left}px`
      newNoteEl.style.top = `${top}px`
    }

    function onMouseMove(event: MouseEvent) {
      setPosition([event.clientX, event.clientY])
    }

    function onBoardClick(event: MouseEvent) {
      const note: Note = {
        id: `${uuid()}_${Date.now()}_${Math.random() * 1000000000}`,
        width: 224,
        height: 224,
        relativePoint: getRelativePoint([event.clientX, event.clientY] as Point, {
          width: boardEl.offsetWidth,
          height: boardEl.offsetHeight,
        }),
        content: '',
        mode: 'edit',
        author: { ...user },
      }
      setNotes(existingNotes => [...existingNotes, note])
      setMode('view')
      onNoteCreated()
      broadcastRef.current({
        event: 'notecreated',
        payload: {
          note,
        },
      })
    }

    window.addEventListener('mousemove', onMouseMove)
    boardEl.addEventListener('click', onBoardClick, {
      once: true
    })

    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('click', onBoardClick)
    }
  }, [mode, controlPosition, onNoteCreated])

  return (
    <div
      ref={boardRef}
      className={
        classNames(
          'absolute top-0 left-0 right-0 bottom-0 w-full h-full pointer-events-none',
        )
      }
    >
      {controlPosition}
      {mode === 'create' && (
        <div
          ref={newNoteRef}
          className="absolute bg-gray-600 border border-gray-700 rounded-2xl w-56 h-56 cursor-grabbing pointer-events-auto animate-enter-in"
        ></div>
      )}
      {notes.map(note => (
        <StickyNote
          key={note.id}
          user={user}
          box={box}
          note={note}
          onNoteChange={handleNoteChange}
          onNoteDelete={handleNoteDelete}
        />
      ))}
    </div>
  )
}
