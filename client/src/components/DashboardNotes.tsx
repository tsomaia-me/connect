import { useCallback, useEffect, useRef, useState } from 'react'
import classNames from 'classnames'
import { arrayBufferToBase64, base64ToArrayBuffer, download, getChunks } from '@/components/shared/utils'
import { Attachment, Box, Note, Point } from '@/components/shared/types'
import { StickyNote } from '@/components/StickyNote'
import {
  PeerEvent,
  useAddPeerEventListener,
  useBroadcaster,
  useRemovePeerEventListener,
  useRoom,
  useSelf,
  useSender,
} from '@/components/WebRTCProvider'
import { Room, User } from '@/app.models'
import { useDashboardNotesContext } from '@/components/DashboardNotesProvider'

export interface DashboardNotesProps {
  isActive: boolean
  controlPosition: Point
}

export function DashboardNotes(props: DashboardNotesProps) {
  const { isActive, controlPosition } = props
  const { notes } = useDashboardNotesContext()
  const self = useSelf()
  const room = useRoom()
  const send = useSender()
  const broadcast = useBroadcaster()
  const addPeerEventListener = useAddPeerEventListener()
  const removePeerEventListener = useRemovePeerEventListener()
  const userRef = useRef<User>(self.user)
  const sendRef = useRef(send)
  const broadcastRef = useRef(broadcast)
  const addPeerEventListenerRef = useRef(addPeerEventListener)
  const removePeerEventListenerRef = useRef(removePeerEventListener)
  const boardRef = useRef<HTMLDivElement | null>(null)

  userRef.current = self.user
  sendRef.current = send
  broadcastRef.current = broadcast
  addPeerEventListenerRef.current = addPeerEventListener
  removePeerEventListenerRef.current = removePeerEventListener

  return (
    <div
      ref={boardRef}
      className={
        classNames(
          'absolute top-0 left-0 right-0 bottom-0 w-full h-full pointer-events-none',
        )
      }
    >
      {notes.map(note => (
        <StickyNote
          key={note.id}
          user={self.user}
          note={note}
        />
      ))}
    </div>
  )
}
